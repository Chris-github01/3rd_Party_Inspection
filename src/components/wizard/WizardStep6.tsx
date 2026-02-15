import { useState } from 'react';
import { MapPin, HelpCircle } from 'lucide-react';
import { WizardData } from '../ProjectWizard';

interface WizardStep6Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function WizardStep6({ data, updateData }: WizardStep6Props) {
  const [showWhat3WordsHelp, setShowWhat3WordsHelp] = useState(false);
  const [what3wordsInput, setWhat3wordsInput] = useState(data.what3words || '');

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

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
        <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-300 mb-2">Interactive map will appear here</p>
        <p className="text-sm text-slate-400">
          In production, this would show a draggable map centered on the address
        </p>
      </div>

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
