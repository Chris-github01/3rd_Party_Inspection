import { useState } from 'react';
import { Image as ImageIcon, Upload, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OnboardingBrandingCardProps {
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  onUpdate: () => void;
}

export function OnboardingBrandingCard({ organization, onUpdate }: OnboardingBrandingCardProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      showMessage('File size must be less than 2MB', 'error');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      showMessage('Only PNG, JPG, JPEG, and SVG files are allowed', 'error');
      return;
    }

    setUploading(true);

    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const extension = file.name.split('.').pop();
      const filePath = `logos/${timestamp}-${random}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: filePath })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      showMessage('Logo uploaded successfully', 'success');
      onUpdate();
    } catch (error) {
      console.error('Error uploading logo:', error);
      showMessage('Failed to upload logo', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!organization.logo_url) return;

    try {
      if (!organization.logo_url.startsWith('http')) {
        const { error: deleteError } = await supabase.storage
          .from('documents')
          .remove([organization.logo_url]);

        if (deleteError) console.error('Error deleting file:', deleteError);
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      showMessage('Logo removed successfully', 'success');
      onUpdate();
    } catch (error) {
      console.error('Error removing logo:', error);
      showMessage('Failed to remove logo', 'error');
    }
  };

  const getLogoUrl = () => {
    if (!organization.logo_url) return null;
    if (organization.logo_url.startsWith('http')) return organization.logo_url;

    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(organization.logo_url);
    return data.publicUrl;
  };

  const logoUrl = getLogoUrl();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-primary-200 p-6">
      <div className="flex items-center mb-4">
        <ImageIcon className="w-5 h-5 text-primary-600 mr-2" />
        <h2 className="text-lg font-semibold text-primary-900">Organisation Branding</h2>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5 mr-2 flex-shrink-0" />
          ) : (
            <X className="w-5 h-5 mr-2 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <p className="text-sm text-primary-600 mb-4">
        This logo will be included in the exported onboarding PDF and DOCX pack.
      </p>

      <div className="space-y-4">
        {logoUrl ? (
          <div className="border border-primary-200 rounded-lg p-4 bg-primary-50/50">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-primary-900">Current Logo</span>
              <button
                onClick={handleRemoveLogo}
                className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </button>
            </div>
            <div className="flex items-center justify-center bg-white border border-primary-200 rounded-lg p-6">
              <img
                src={logoUrl}
                alt="Organisation logo"
                className="max-h-24 max-w-full object-contain"
              />
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-primary-300 rounded-lg p-8 text-center bg-primary-50/30">
            <ImageIcon className="w-12 h-12 text-primary-400 mx-auto mb-3" />
            <p className="text-sm text-primary-600 mb-1">No logo uploaded</p>
            <p className="text-xs text-primary-500">Upload a logo to include it in onboarding packs</p>
          </div>
        )}

        <div>
          <input
            type="file"
            id="logo-upload"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <label
            htmlFor="logo-upload"
            className={`inline-flex items-center px-4 py-2 border border-primary-600 rounded-lg font-medium text-primary-600 bg-white hover:bg-primary-50 transition-colors cursor-pointer ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
          </label>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 font-medium mb-1">Accepted file types:</p>
          <p className="text-sm text-blue-700">PNG, JPG, JPEG, SVG</p>
          <p className="text-sm text-blue-900 font-medium mt-2 mb-1">Maximum file size:</p>
          <p className="text-sm text-blue-700">2MB</p>
        </div>
      </div>
    </div>
  );
}
