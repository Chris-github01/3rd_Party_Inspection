import { useState, useEffect, useRef } from 'react';
import { MapPin, HelpCircle, AlertCircle } from 'lucide-react';
import { WizardData } from '../ProjectWizard';

interface WizardStep6Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export function WizardStep6({ data, updateData }: WizardStep6Props) {
  const [showWhat3WordsHelp, setShowWhat3WordsHelp] = useState(false);
  const [what3wordsInput, setWhat3wordsInput] = useState(data.what3words || '');
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      setLoadError(true);
      return;
    }

    if (window.google?.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      window.initGoogleMaps = () => {
        setGoogleMapsLoaded(true);
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setLoadError(true);
      };
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (googleMapsLoaded && mapRef.current && !mapInstanceRef.current) {
      const defaultLat = data.latitude || -36.8485;
      const defaultLng = data.longitude || 174.7633;

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });

      const marker = new window.google.maps.Marker({
        position: { lat: defaultLat, lng: defaultLng },
        map: map,
        draggable: true,
        title: 'Drag to set location',
      });

      marker.addListener('dragend', () => {
        const position = marker.getPosition();
        updateData({
          latitude: position.lat(),
          longitude: position.lng(),
        });
      });

      map.addListener('click', (e: any) => {
        marker.setPosition(e.latLng);
        updateData({
          latitude: e.latLng.lat(),
          longitude: e.latLng.lng(),
        });
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }
  }, [googleMapsLoaded, data.latitude, data.longitude, updateData]);

  useEffect(() => {
    if (markerRef.current && data.latitude && data.longitude) {
      const newPosition = { lat: data.latitude, lng: data.longitude };
      markerRef.current.setPosition(newPosition);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(newPosition);
      }
    }
  }, [data.latitude, data.longitude]);

  const handleWhat3WordsLookup = () => {
    if (!what3wordsInput.startsWith('///')) {
      alert('what3words address must start with ///');
      return;
    }

    const parts = what3wordsInput.substring(3).split('.');
    if (parts.length !== 3) {
      alert('Invalid what3words format. Should be ///word.word.word');
      return;
    }

    updateData({ what3words: what3wordsInput });
    alert('what3words recognized! In production, this would convert to coordinates.');
  };

  const handleLatLngChange = (lat: string, lng: string) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    updateData({
      latitude: isNaN(latitude) ? null : latitude,
      longitude: isNaN(longitude) ? null : longitude,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Site Location
        </h3>
        <p className="text-slate-300">
          Set the precise GPS coordinates for the project site
        </p>
      </div>

      {loadError && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-200 font-medium">Google Maps API Key Required</p>
            <p className="text-xs text-yellow-300 mt-1">
              To enable interactive map, add your Google Maps API key to the .env file as VITE_GOOGLE_MAPS_API_KEY
            </p>
          </div>
        </div>
      )}

      {googleMapsLoaded ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div ref={mapRef} className="w-full h-96"></div>
          <div className="p-3 bg-slate-700 text-xs text-slate-300">
            <p>Click on the map or drag the marker to set the precise location</p>
          </div>
        </div>
      ) : loadError ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
          <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-300 mb-2">Map unavailable</p>
          <p className="text-sm text-slate-400">
            Configure Google Maps API key to enable interactive map
          </p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
          <div className="animate-pulse">
            <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-300">Loading map...</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Latitude <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.000001"
            value={data.latitude || ''}
            onChange={(e) => handleLatLngChange(e.target.value, String(data.longitude || ''))}
            placeholder="e.g., -36.5489"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Longitude <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.000001"
            value={data.longitude || ''}
            onChange={(e) => handleLatLngChange(String(data.latitude || ''), e.target.value)}
            placeholder="e.g., 174.6977"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
          />
        </div>
      </div>

      <div className="border-t border-slate-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-slate-300">
            what3words (optional)
          </label>
          <button
            onClick={() => setShowWhat3WordsHelp(!showWhat3WordsHelp)}
            className="flex items-center gap-1 text-sm text-primary-400 hover:underline"
          >
            <HelpCircle className="w-4 h-4" />
            What is what3words?
          </button>
        </div>

        {showWhat3WordsHelp && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-slate-300 mb-2">
              what3words is a simple way to share exact geolocations using just three words.
            </p>
            <p className="text-sm text-slate-300">
              Every 3m x 3m square in the world has been given a unique combination of three words.
              For example, the Orewa Beach location might be ///filled.count.soap
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              ///
            </span>
            <input
              type="text"
              value={what3wordsInput.replace('///', '')}
              onChange={(e) => setWhat3wordsInput(`///${e.target.value.replace('///', '')}`)}
              placeholder="word.word.word"
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
            />
          </div>
          <button
            onClick={handleWhat3WordsLookup}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Find Location
          </button>
        </div>

        {data.what3words && (
          <div className="mt-3 p-3 bg-green-900/30 border border-green-700 rounded-lg">
            <p className="text-sm text-green-300">
              what3words recognized: <span className="font-mono font-semibold">{data.what3words}</span>
            </p>
          </div>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h5 className="font-semibold text-white mb-2">Location Summary</h5>
        <div className="text-sm text-slate-300 space-y-1">
          <p>
            <span className="font-medium">Coordinates:</span>{' '}
            {data.latitude && data.longitude
              ? `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`
              : 'Not set'}
          </p>
          {data.what3words && (
            <p>
              <span className="font-medium">what3words:</span> {data.what3words}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
