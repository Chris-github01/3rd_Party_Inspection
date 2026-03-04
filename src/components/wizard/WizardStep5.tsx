import { WizardData } from '../ProjectWizard';
import { Building } from 'lucide-react';

interface WizardStep5Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function WizardStep5({ data, updateData }: WizardStep5Props) {
  return (
    <div className="space-y-6">
      {data.organizationName && (
        <div className="bg-primary-900/20 border border-primary-600/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            {data.organizationLogoUrl ? (
              <img
                src={data.organizationLogoUrl}
                alt={data.organizationName}
                className="w-12 h-12 object-contain rounded"
              />
            ) : (
              <Building className="w-12 h-12 text-primary-400" />
            )}
            <div>
              <p className="text-xs text-slate-400">Organization</p>
              <p className="text-sm font-semibold text-white">{data.organizationName}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Site Address
        </h3>
        <p className="text-slate-300">
          Enter the physical location of the project site
        </p>
      </div>

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
      </div>
    </div>
  );
}
