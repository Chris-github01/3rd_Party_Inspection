import { useState } from 'react';
import { X, RotateCw, RotateCcw } from 'lucide-react';

interface RotateModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageCount: number;
  onRotate: (pages: string, degrees: number) => Promise<void>;
}

export function RotateModal({ isOpen, onClose, pageCount, onRotate }: RotateModalProps) {
  const [selectedPages, setSelectedPages] = useState('all');
  const [customPages, setCustomPages] = useState('');
  const [degrees, setDegrees] = useState(90);
  const [isRotating, setIsRotating] = useState(false);

  if (!isOpen) return null;

  const handleRotate = async () => {
    const pagesToRotate = selectedPages === 'all' ? 'all' : customPages;

    if (selectedPages === 'custom' && !customPages.trim()) {
      alert('Please specify which pages to rotate');
      return;
    }

    setIsRotating(true);
    try {
      await onRotate(pagesToRotate, degrees);
      onClose();
    } catch (error) {
      console.error('Rotate failed:', error);
      alert('Failed to rotate pages. Please try again.');
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Rotate Pages</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Select rotation angle
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDegrees(90)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  degrees === 90
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <RotateCw className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <div className="text-sm font-medium text-slate-900">90° Clockwise</div>
              </button>

              <button
                onClick={() => setDegrees(180)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  degrees === 180
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <RotateCw className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <div className="text-sm font-medium text-slate-900">180°</div>
              </button>

              <button
                onClick={() => setDegrees(270)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  degrees === 270
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <RotateCcw className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <div className="text-sm font-medium text-slate-900">90° Counter-CW</div>
              </button>

              <button
                onClick={() => setDegrees(-90)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  degrees === -90
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <RotateCcw className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <div className="text-sm font-medium text-slate-900">Custom Angle</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Select pages to rotate
            </label>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="pageSelection"
                  value="all"
                  checked={selectedPages === 'all'}
                  onChange={(e) => setSelectedPages(e.target.value)}
                />
                <div>
                  <div className="font-medium text-slate-900">All pages</div>
                  <div className="text-sm text-slate-600">
                    Rotate all {pageCount} pages
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="pageSelection"
                  value="custom"
                  checked={selectedPages === 'custom'}
                  onChange={(e) => setSelectedPages(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900 mb-1">
                    Specific pages
                  </div>
                  <div className="text-sm text-slate-600 mb-2">
                    Enter page numbers or ranges
                  </div>
                  {selectedPages === 'custom' && (
                    <input
                      type="text"
                      value={customPages}
                      onChange={(e) => setCustomPages(e.target.value)}
                      placeholder="e.g., 1-10, 15, 20-"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-800">
              <strong>Preview:</strong>
            </p>
            <p className="text-sm text-purple-700 mt-1">
              {selectedPages === 'all'
                ? `All ${pageCount} pages will be rotated ${degrees}°`
                : customPages
                ? `Pages ${customPages} will be rotated ${degrees}°`
                : 'Select pages to rotate'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isRotating}
            className="px-4 py-2 text-slate-700 hover:text-slate-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRotate}
            disabled={isRotating || (selectedPages === 'custom' && !customPages.trim())}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRotating ? 'Rotating...' : 'Rotate Pages'}
          </button>
        </div>
      </div>
    </div>
  );
}
