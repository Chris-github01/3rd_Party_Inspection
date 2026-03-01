import { useState } from 'react';
import { X } from 'lucide-react';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageCount: number;
  onSplit: (method: 'pages' | 'every-n', data: any) => Promise<void>;
}

export function SplitModal({ isOpen, onClose, pageCount, onSplit }: SplitModalProps) {
  const [splitMethod, setSplitMethod] = useState<'pages' | 'every-n'>('pages');
  const [splitPages, setSplitPages] = useState('');
  const [everyNPages, setEveryNPages] = useState('10');
  const [isSplitting, setIsSplitting] = useState(false);

  if (!isOpen) return null;

  const handleSplit = async () => {
    setIsSplitting(true);
    try {
      if (splitMethod === 'pages') {
        await onSplit('pages', { splitPages });
      } else {
        await onSplit('every-n', { everyNPages: parseInt(everyNPages, 10) });
      }
      onClose();
    } catch (error) {
      console.error('Split failed:', error);
      alert('Failed to split PDF. Please try again.');
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Split PDF</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-slate-600 mb-4">
              Current PDF has <strong>{pageCount}</strong> pages
            </p>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="splitMethod"
                  value="pages"
                  checked={splitMethod === 'pages'}
                  onChange={(e) => setSplitMethod(e.target.value as 'pages')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900 mb-1">
                    Split at specific pages
                  </div>
                  <div className="text-sm text-slate-600 mb-2">
                    Enter page numbers where you want to split
                  </div>
                  {splitMethod === 'pages' && (
                    <input
                      type="text"
                      value={splitPages}
                      onChange={(e) => setSplitPages(e.target.value)}
                      placeholder="e.g., 5, 10, 20"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  )}
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="splitMethod"
                  value="every-n"
                  checked={splitMethod === 'every-n'}
                  onChange={(e) => setSplitMethod(e.target.value as 'every-n')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900 mb-1">
                    Split every N pages
                  </div>
                  <div className="text-sm text-slate-600 mb-2">
                    Automatically split into equal chunks
                  </div>
                  {splitMethod === 'every-n' && (
                    <input
                      type="number"
                      min="1"
                      max={pageCount}
                      value={everyNPages}
                      onChange={(e) => setEveryNPages(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {splitMethod === 'pages' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 mb-2">
                <strong>Example:</strong>
              </p>
              <p className="text-sm text-green-700">
                Entering "5, 10" will create 3 files:
              </p>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• File 1: Pages 1-5</li>
                <li>• File 2: Pages 6-10</li>
                <li>• File 3: Pages 11-{pageCount}</li>
              </ul>
            </div>
          )}

          {splitMethod === 'every-n' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 mb-2">
                <strong>Result:</strong>
              </p>
              <p className="text-sm text-green-700">
                This will create approximately{' '}
                <strong>{Math.ceil(pageCount / parseInt(everyNPages || '1'))}</strong>{' '}
                files, each with {everyNPages} pages
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isSplitting}
            className="px-4 py-2 text-slate-700 hover:text-slate-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSplit}
            disabled={
              isSplitting ||
              (splitMethod === 'pages' && !splitPages.trim()) ||
              (splitMethod === 'every-n' && !everyNPages)
            }
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSplitting ? 'Splitting...' : 'Split PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
