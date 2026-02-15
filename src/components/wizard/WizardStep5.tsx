import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { WizardData } from '../ProjectWizard';

interface WizardStep5Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function WizardStep5({ data, updateData }: WizardStep5Props) {
  const [manualEntry, setManualEntry] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          Site Address
        </h3>
        <p className="text-slate-600">
          Enter the physical location of the project site
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Country
          </label>
          <select
            value={data.country}
            onChange={(e) => updateData({ country: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="New Zealand">New Zealand</option>
            <option value="Australia">Australia</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="United States">United States</option>
            <option value="Canada">Canada</option>
          </select>
        </div>

        {!manualEntry ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={data.addressLine}
                onChange={(e) => updateData({ addressLine: e.target.value })}
                placeholder="Start typing an address..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Address search integration coming soon. Use manual entry for now.
            </p>
            <button
              onClick={() => setManualEntry(true)}
              className="mt-2 text-sm text-primary-600 hover:underline"
            >
              Enter address manually
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.addressLine}
                onChange={(e) => updateData({ addressLine: e.target.value })}
                placeholder="e.g., 123 Main Street"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Suburb
              </label>
              <input
                type="text"
                value={data.suburb}
                onChange={(e) => updateData({ suburb: e.target.value })}
                placeholder="e.g., Orewa"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.city}
                  onChange={(e) => updateData({ city: e.target.value })}
                  placeholder="e.g., Auckland"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Postcode
                </label>
                <input
                  type="text"
                  value={data.postcode}
                  onChange={(e) => updateData({ postcode: e.target.value })}
                  placeholder="e.g., 0931"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <button
              onClick={() => setManualEntry(false)}
              className="text-sm text-primary-600 hover:underline"
            >
              Use address search instead
            </button>
          </>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h5 className="font-semibold text-slate-900 mb-2">Preview</h5>
        <p className="text-sm text-slate-700">
          {data.addressLine && `${data.addressLine}`}
          {data.suburb && `, ${data.suburb}`}
          {data.city && `, ${data.city}`}
          {data.postcode && ` ${data.postcode}`}
          {data.country && `, ${data.country}`}
          {!data.addressLine && !data.city && (
            <span className="text-slate-500">Enter address details above</span>
          )}
        </p>
      </div>
    </div>
  );
}
