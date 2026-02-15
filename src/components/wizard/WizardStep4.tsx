import { Image, FileText, HelpCircle } from 'lucide-react';
import { WizardData } from '../ProjectWizard';
import { useState } from 'react';

interface WizardStep4Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function WizardStep4({ data, updateData }: WizardStep4Props) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          Drawing Mode
        </h3>
        <p className="text-slate-600">
          Choose how you want to manage work locations
        </p>
      </div>

      <div className="space-y-4">
        <label
          className={`flex items-start gap-4 p-6 border-2 rounded-lg cursor-pointer transition-all ${
            data.drawingMode === 'with_drawings'
              ? 'border-primary-600 bg-primary-50'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <input
            type="radio"
            name="drawingMode"
            value="with_drawings"
            checked={data.drawingMode === 'with_drawings'}
            onChange={(e) => updateData({ drawingMode: e.target.value as 'with_drawings' })}
            className="mt-1 w-5 h-5 text-primary-600"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Image className={`w-6 h-6 ${data.drawingMode === 'with_drawings' ? 'text-primary-600' : 'text-slate-400'}`} />
              <h4 className="font-semibold text-slate-900">With Drawings</h4>
            </div>
            <p className="text-sm text-slate-600">
              Upload site drawings to pin survey, install and inspection locations.
              Ideal for large projects with architectural plans.
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-4 p-6 border-2 rounded-lg cursor-pointer transition-all ${
            data.drawingMode === 'without_drawings'
              ? 'border-primary-600 bg-primary-50'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <input
            type="radio"
            name="drawingMode"
            value="without_drawings"
            checked={data.drawingMode === 'without_drawings'}
            onChange={(e) => updateData({ drawingMode: e.target.value as 'without_drawings' })}
            className="mt-1 w-5 h-5 text-primary-600"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className={`w-6 h-6 ${data.drawingMode === 'without_drawings' ? 'text-primary-600' : 'text-slate-400'}`} />
              <h4 className="font-semibold text-slate-900">Without Drawings</h4>
            </div>
            <p className="text-sm text-slate-600">
              Create work locations using custom fields only.
              Best for smaller projects or when drawings aren't available.
            </p>
          </div>
        </label>
      </div>

      <button
        onClick={() => setShowHelp(!showHelp)}
        className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
      >
        <HelpCircle className="w-4 h-4" />
        Not sure what drawing mode is right for you?
      </button>

      {showHelp && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h5 className="font-semibold text-slate-900 mb-2">Drawing Mode Guide</h5>
          <div className="space-y-3 text-sm text-slate-700">
            <div>
              <p className="font-medium mb-1">With Drawings:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2">
                <li>Upload PDF or image drawings</li>
                <li>Pin locations directly on drawings</li>
                <li>Visual reference for inspectors</li>
                <li>Export drawings with inspection data</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Without Drawings:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2">
                <li>Faster setup for small projects</li>
                <li>Use text fields for location descriptions</li>
                <li>No drawing uploads required</li>
                <li>Still supports full inspection workflow</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
