import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Office {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  travel_km_rate: number;
  travel_parking_note: string;
  is_cbd: boolean;
  cbd_parking_surcharge: number;
}

interface TravelCalcRequest {
  siteAddress: string;
  officeId?: string;
  baseAddress?: string;
  baseLat?: number;
  baseLng?: number;
  googleMapsApiKey?: string;
  kmRate?: number;
  parkingNote?: string;
}

interface GeoPoint {
  lat: number;
  lng: number;
  display_name?: string;
}

interface TravelCalcResult {
  distanceKm: number;
  distanceKmReturn: number;
  travelTimeMinutes: number;
  zone: "local" | "extended" | "regional" | "national";
  zoneLabel: string;
  zoneDescription: string;
  suggestedTravelCost: number;
  travelSurcharge: number;
  travelLabourHours: number;
  parkingNote: string;
  isCbd: boolean;
  cbdParkingSurcharge: number;
  cbdCongestionNote: string;
  suggestOvernight: boolean;
  overnightNote: string;
  officeUsed: { id: string; name: string } | null;
  allOffices: Array<{ id: string; name: string; distanceKm: number; address: string | null }>;
  siteGeoPoint: GeoPoint | null;
  baseGeoPoint: GeoPoint | null;
  source: "google" | "osm" | "haversine_estimate";
  notes: string[];
}

const ZONE_CONFIG = {
  local:    { label: "Zone A — Local Metro (0–25 km)",         description: "Included in callout / local rate", surcharge: 0   },
  extended: { label: "Zone B — Extended Metro (25–60 km)",     description: "Fixed travel surcharge applies",   surcharge: 120 },
  regional: { label: "Zone C — Regional Day Trip (60–150 km)", description: "Km charge + travel time billed",   surcharge: 0   },
  national: { label: "Zone D — National (150 km+)",            description: "Regional / overnight — review",    surcharge: 0   },
} as const;

type ZoneId = keyof typeof ZONE_CONFIG;

function zoneFromKm(km: number): ZoneId {
  if (km < 25)  return "local";
  if (km < 60)  return "extended";
  if (km < 150) return "regional";
  return "national";
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeOSM(address: string): Promise<GeoPoint | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=nz`;
    const res = await fetch(url, { headers: { "User-Agent": "BurnRatePro/1.0 travel-pricing-calc" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name };
  } catch { return null; }
}

async function geocodeGoogle(address: string, apiKey: string): Promise<GeoPoint | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=nz`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]) return null;
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng, display_name: data.results[0].formatted_address };
  } catch { return null; }
}

async function getDistanceGoogle(
  origin: GeoPoint, dest: GeoPoint, apiKey: string,
): Promise<{ distanceM: number; durationS: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${dest.lat},${dest.lng}&key=${apiKey}&region=nz&mode=driving`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") return null;
    return { distanceM: element.distance.value, durationS: element.duration.value };
  } catch { return null; }
}

function calcTravelCost(km: number, kmRate: number, zone: ZoneId): { cost: number; surcharge: number } {
  if (zone === "local")    return { cost: 0, surcharge: 0 };
  if (zone === "extended") return { cost: 0, surcharge: ZONE_CONFIG.extended.surcharge };
  const cost = km * 2 * kmRate;
  return { cost: Math.round(cost), surcharge: 0 };
}

function calcTravelLabourHours(travelTimeMinutes: number): number {
  return Math.round((travelTimeMinutes / 60) * 2 * 4) / 4;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: TravelCalcRequest = await req.json();
    const { siteAddress, officeId, baseAddress, baseLat, baseLng, googleMapsApiKey, kmRate = 1.20, parkingNote = "Parking charged at cost" } = body;

    if (!siteAddress?.trim()) {
      return new Response(
        JSON.stringify({ error: "siteAddress is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let resolvedBaseAddress = baseAddress;
    let resolvedBaseLat    = baseLat;
    let resolvedBaseLng    = baseLng;
    let resolvedKmRate     = kmRate;
    let resolvedParkingNote = parkingNote;
    let isCbd              = false;
    let cbdParkingSurcharge = 40;
    let usedOffice: { id: string; name: string } | null = null;
    let allOffices: Array<{ id: string; name: string; distanceKm: number; address: string | null }> = [];

    const { data: offices } = await supabase
      .from("offices")
      .select("id,name,address,lat,lng,is_default,travel_km_rate,travel_parking_note,is_cbd,cbd_parking_surcharge")
      .eq("active", true)
      .order("is_default", { ascending: false });

    const notes: string[] = [];
    let source: TravelCalcResult["source"] = "haversine_estimate";

    // --- Geocode site address ---
    let sitePoint: GeoPoint | null = null;
    if (googleMapsApiKey) {
      sitePoint = await geocodeGoogle(siteAddress, googleMapsApiKey);
      if (sitePoint) source = "google";
    }
    if (!sitePoint) {
      sitePoint = await geocodeOSM(siteAddress);
      if (sitePoint) source = "osm";
    }
    if (!sitePoint) {
      notes.push("Could not geocode site address — using zone estimate only.");
    }

    // --- Resolve office / base ---
    let basePoint: GeoPoint | null = null;

    if (offices && offices.length > 0 && sitePoint) {
      // Compute distance from each office to site
      const withDist: Array<Office & { _dist: number }> = offices.map((o: Office) => ({
        ...o,
        _dist: (o.lat && o.lng)
          ? haversineKm(o.lat, o.lng, sitePoint!.lat, sitePoint!.lng) * 1.25
          : 9999,
      }));

      allOffices = withDist.map(o => ({ id: o.id, name: o.name, distanceKm: Math.round(o._dist * 10) / 10, address: o.address }));

      let chosenOffice: (Office & { _dist: number }) | undefined;
      if (officeId) {
        chosenOffice = withDist.find(o => o.id === officeId);
      }
      if (!chosenOffice) {
        chosenOffice = withDist.slice().sort((a, b) => a._dist - b._dist)[0];
      }

      if (chosenOffice) {
        usedOffice = { id: chosenOffice.id, name: chosenOffice.name };
        if (chosenOffice.lat && chosenOffice.lng) {
          basePoint = { lat: chosenOffice.lat, lng: chosenOffice.lng, display_name: chosenOffice.address ?? chosenOffice.name };
          resolvedBaseLat = chosenOffice.lat;
          resolvedBaseLng = chosenOffice.lng;
        } else if (chosenOffice.address) {
          resolvedBaseAddress = chosenOffice.address;
        }
        resolvedKmRate       = chosenOffice.travel_km_rate ?? resolvedKmRate;
        resolvedParkingNote  = chosenOffice.travel_parking_note ?? resolvedParkingNote;
        isCbd                = chosenOffice.is_cbd;
        cbdParkingSurcharge  = chosenOffice.cbd_parking_surcharge ?? 40;
      }
    }

    // Fallback to company_settings if no offices
    if (!basePoint && !resolvedBaseLat && !resolvedBaseAddress) {
      const { data: cs } = await supabase
        .from("company_settings")
        .select("base_address,base_lat,base_lng,travel_km_rate,travel_parking_note")
        .maybeSingle();
      if (cs) {
        resolvedBaseAddress  = cs.base_address  ?? resolvedBaseAddress;
        resolvedBaseLat      = cs.base_lat      ?? resolvedBaseLat;
        resolvedBaseLng      = cs.base_lng      ?? resolvedBaseLng;
        resolvedKmRate       = cs.travel_km_rate ?? resolvedKmRate;
        resolvedParkingNote  = cs.travel_parking_note ?? resolvedParkingNote;
      }
    }

    // Geocode base if we only have address
    if (!basePoint) {
      if (resolvedBaseLat && resolvedBaseLng) {
        basePoint = { lat: resolvedBaseLat, lng: resolvedBaseLng, display_name: resolvedBaseAddress };
      } else if (resolvedBaseAddress) {
        if (googleMapsApiKey) basePoint = await geocodeGoogle(resolvedBaseAddress, googleMapsApiKey);
        if (!basePoint)       basePoint = await geocodeOSM(resolvedBaseAddress);
      }
    }

    if (!basePoint) {
      notes.push("No base address configured — set your office address in Organization Settings.");
    }

    // --- Calculate distance ---
    let distanceKm = 0;
    let travelTimeMinutes = 0;

    if (sitePoint && basePoint) {
      if (googleMapsApiKey && source === "google") {
        const road = await getDistanceGoogle(basePoint, sitePoint, googleMapsApiKey);
        if (road) {
          distanceKm = Math.round((road.distanceM / 1000) * 10) / 10;
          travelTimeMinutes = Math.round(road.durationS / 60);
          source = "google";
        } else {
          const straight = haversineKm(basePoint.lat, basePoint.lng, sitePoint.lat, sitePoint.lng);
          distanceKm = Math.round(straight * 1.15 * 10) / 10;
          travelTimeMinutes = Math.round((distanceKm / 80) * 60);
          source = "haversine_estimate";
          notes.push("Google Distance Matrix unavailable — using straight-line estimate (+15% road factor).");
        }
      } else {
        const straight = haversineKm(basePoint.lat, basePoint.lng, sitePoint.lat, sitePoint.lng);
        distanceKm = Math.round(straight * 1.25 * 10) / 10;
        travelTimeMinutes = Math.round((distanceKm / 70) * 60);
        source = sitePoint ? "osm" : "haversine_estimate";
        notes.push("Distance estimated using straight-line + 25% road factor (OpenStreetMap). Enable Google Maps for road-accurate distances.");
      }
    }

    const zone = zoneFromKm(distanceKm);
    const { cost: suggestedTravelCost, surcharge: travelSurcharge } = calcTravelCost(distanceKm, resolvedKmRate, zone);
    const travelLabourHours = calcTravelLabourHours(travelTimeMinutes);

    // Overnight suggestion: round trip > 4 hours
    const roundTripMinutes = travelTimeMinutes * 2;
    const suggestOvernight = roundTripMinutes > 240;
    const overnightNote = suggestOvernight
      ? `Round trip is approx. ${Math.round(roundTripMinutes / 60 * 10) / 10}h — consider overnight to avoid inspector fatigue. Add accommodation to costing.`
      : "";

    // CBD mode
    const cbdCongestionNote = isCbd
      ? "CBD site — allow for parking building/voucher costs and peak-hour congestion. Budget extra 20–30 min each way."
      : "";

    const result: TravelCalcResult = {
      distanceKm,
      distanceKmReturn: distanceKm * 2,
      travelTimeMinutes,
      zone,
      zoneLabel: ZONE_CONFIG[zone].label,
      zoneDescription: ZONE_CONFIG[zone].description,
      suggestedTravelCost,
      travelSurcharge,
      travelLabourHours,
      parkingNote: resolvedParkingNote,
      isCbd,
      cbdParkingSurcharge,
      cbdCongestionNote,
      suggestOvernight,
      overnightNote,
      officeUsed: usedOffice,
      allOffices,
      siteGeoPoint: sitePoint,
      baseGeoPoint: basePoint,
      source,
      notes,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
