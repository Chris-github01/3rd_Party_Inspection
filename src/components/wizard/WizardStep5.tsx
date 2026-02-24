import { useState, useEffect, useRef } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { WizardData } from '../ProjectWizard';

interface WizardStep5Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export function WizardStep5({ data, updateData }: WizardStep5Props) {
  const [manualEntry, setManualEntry] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const autocompleteRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      setLoadError(true);
      setManualEntry(true);
      return;
    }

    if (window.google?.maps?.places) {
      setGoogleMapsLoaded(true);
      return;
    }

    window.initGoogleMaps = () => {
      setGoogleMapsLoaded(true);
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setLoadError(true);
      setManualEntry(true);
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (googleMapsLoaded && inputRef.current && !manualEntry) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        fields: ['address_components', 'formatted_address', 'geometry', 'name'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.address_components) {
          return;
        }

        let streetNumber = '';
        let route = '';
        let suburb = '';
        let city = '';
        let postcode = '';
        let country = '';
        let latitude = place.geometry?.location?.lat();
        let longitude = place.geometry?.location?.lng();

        place.address_components.forEach((component: any) => {
          const types = component.types;

          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          }
          if (types.includes('route')) {
            route = component.long_name;
          }
          if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
            suburb = component.long_name;
          }
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('postal_code')) {
            postcode = component.long_name;
          }
          if (types.includes('country')) {
            country = component.long_name;
          }
        });

        const addressLine = [streetNumber, route].filter(Boolean).join(' ');

        updateData({
          addressLine: addressLine || place.name || '',
          suburb,
          city,
          postcode,
          country,
          latitude,
          longitude,
        });
      });

      autocompleteRef.current = autocomplete;
    }
  }, [googleMapsLoaded, manualEntry, updateData]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Site Address
        </h3>
        <p className="text-slate-300">
          Enter the physical location of the project site
        </p>
      </div>

      {loadError && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-200 font-medium">Google Maps API Key Required</p>
            <p className="text-xs text-yellow-300 mt-1">
              To enable address autocomplete, add your Google Maps API key to the .env file as VITE_GOOGLE_MAPS_API_KEY
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Country
          </label>
          <select
            value={data.country}
            onChange={(e) => updateData({ country: e.target.value })}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="New Zealand">New Zealand</option>
            <option value="Australia">Australia</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="United States">United States</option>
            <option value="Canada">Canada</option>
          </select>
        </div>

        {!manualEntry && googleMapsLoaded ? (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Search Address <span className="text-green-500 text-xs">(Google Maps Enabled)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                defaultValue={data.addressLine}
                placeholder="Start typing an address..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Address suggestions will appear as you type
            </p>
            <button
              onClick={() => setManualEntry(true)}
              className="mt-2 text-sm text-primary-400 hover:underline"
            >
              Enter address manually
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.addressLine}
                onChange={(e) => updateData({ addressLine: e.target.value })}
                placeholder="e.g., 123 Main Street"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Suburb
              </label>
              <input
                type="text"
                value={data.suburb}
                onChange={(e) => updateData({ suburb: e.target.value })}
                placeholder="e.g., Orewa"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.city}
                  onChange={(e) => updateData({ city: e.target.value })}
                  placeholder="e.g., Auckland"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Postcode
                </label>
                <input
                  type="text"
                  value={data.postcode}
                  onChange={(e) => updateData({ postcode: e.target.value })}
                  placeholder="e.g., 0931"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
                />
              </div>
            </div>

            {!loadError && (
              <button
                onClick={() => setManualEntry(false)}
                className="text-sm text-primary-400 hover:underline"
              >
                Use address search instead
              </button>
            )}
          </>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h5 className="font-semibold text-white mb-2">Preview</h5>
        <p className="text-sm text-slate-300">
          {data.addressLine && `${data.addressLine}`}
          {data.suburb && `, ${data.suburb}`}
          {data.city && `, ${data.city}`}
          {data.postcode && ` ${data.postcode}`}
          {data.country && `, ${data.country}`}
          {!data.addressLine && !data.city && (
            <span className="text-slate-400">Enter address details above</span>
          )}
        </p>
        {data.latitude && data.longitude && (
          <p className="text-xs text-slate-400 mt-2">
            Coordinates: {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
          </p>
        )}
      </div>
    </div>
  );
}
