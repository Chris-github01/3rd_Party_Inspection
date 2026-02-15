import { useState } from 'react';
import { X, Upload, FileImage } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UploadDrawingModalProps {
  isOpen: boolean;
  levelId: string;
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadDrawingModal({
  isOpen,
  levelId,
  projectId,
  onClose,
  onSuccess,
}: UploadDrawingModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pageNumber, setPageNumber] = useState('1');
  const [scaleFactor, setScaleFactor] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please select a PDF, PNG, or JPG file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert([
          {
            project_id: projectId,
            type: 'drawing',
            filename: fileName,
            original_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            storage_path: filePath,
          },
        ])
        .select()
        .single();

      if (docError) throw docError;

      const { error: drawingError } = await supabase.from('drawings').insert([
        {
          level_id: levelId,
          document_id: document.id,
          page_number: parseInt(pageNumber) || 1,
          preview_image_path: filePath,
          scale_factor: scaleFactor ? parseFloat(scaleFactor) : null,
        },
      ]);

      if (drawingError) throw drawingError;

      setFile(null);
      setPageNumber('1');
      setScaleFactor('');
      onSuccess();
    } catch (err: any) {
      console.error('Error uploading drawing:', err);
      setError(err.message || 'Failed to upload drawing');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Upload Drawing</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Drawing File <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-300 mb-2 bg-blue-900/30 border border-blue-700 rounded p-2">
              <strong>Tip:</strong> Both PDF and image files (PNG, JPG) are supported with full pin annotation capabilities.
            </p>
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 bg-slate-700">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
                id="drawing-upload"
                disabled={uploading}
              />
              <label
                htmlFor="drawing-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                {file ? (
                  <>
                    <FileImage className="w-12 h-12 text-green-400 mb-2" />
                    <p className="text-sm text-white font-medium">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-400 mb-2" />
                    <p className="text-sm text-white font-medium">
                      Click to upload a drawing
                    </p>
                    <p className="text-xs text-slate-400 mt-1">PDF, PNG, or JPG</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Page Number (for PDFs)
            </label>
            <input
              type="number"
              min="1"
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              placeholder="1"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
              disabled={uploading}
            />
            <p className="text-xs text-slate-400 mt-1">
              For multi-page PDFs, specify which page to use
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Scale Factor (optional)
            </label>
            <input
              type="number"
              step="0.01"
              value={scaleFactor}
              onChange={(e) => setScaleFactor(e.target.value)}
              placeholder="e.g., 100 (1:100 scale)"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
              disabled={uploading}
            />
            <p className="text-xs text-slate-400 mt-1">
              Optional: Drawing scale ratio for measurements
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={uploading || !file}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Drawing'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
