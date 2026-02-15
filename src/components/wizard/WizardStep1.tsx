import { useAuth } from '../../contexts/AuthContext';
import { WizardData } from '../ProjectWizard';
import { ImageUpload } from '../ImageUpload';

interface WizardStep1Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function WizardStep1({ data, updateData }: WizardStep1Props) {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Add Project Details
        </h3>
        <p className="text-slate-300">
          Enter the basic information for your new project
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.projectName}
            onChange={(e) => updateData({ projectName: e.target.value })}
            placeholder="e.g., Orewa Primary School Fire Protection"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Package
          </label>
          <input
            type="text"
            value={data.package}
            onChange={(e) => updateData({ package: e.target.value })}
            placeholder="e.g., Phase 1, Building A"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
          />
          <p className="mt-1 text-xs text-slate-400">
            Optional: Specify a package or phase identifier
          </p>
        </div>

        <ImageUpload
          currentImagePath={data.projectImagePath}
          onImageUploaded={(path) => updateData({ projectImagePath: path })}
          label="Project Image"
          maxSizeMB={10}
        />

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Site Type
          </label>
          <input
            type="text"
            value={data.siteType}
            disabled
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-slate-400 rounded-lg"
          />
          <p className="mt-1 text-xs text-slate-400">
            This wizard creates single site projects only
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Created By
          </label>
          <input
            type="text"
            value={profile?.name || 'Current User'}
            disabled
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-slate-400 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
