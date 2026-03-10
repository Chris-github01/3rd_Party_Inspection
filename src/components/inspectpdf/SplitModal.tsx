import { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { pdfjsLib } from '../../lib/pdfjs';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageCount: number;
  onSplit: (method: 'pages' | 'every-n', data: any) => Promise<void>;
  onImportAndSplit?: (file: File, method: 'pages' | 'every-n', data: any) => Promise<void>;
}

export function SplitModal({ isOpen, onClose, pageCount, onSplit, onImportAndSplit }: SplitModalProps) {
  const [splitMethod, setSplitMethod] = useState<'pages' | 'every-n'>('pages');
  const [splitPages, setSplitPages] = useState('');
  const [everyNPages, setEveryNPages] = useState('10');
  const [isSplitting, setIsSplitting] = useState(false);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [importedPageCount, setImportedPageCount] = useState<number | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  if (!isOpen) return null;

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.type !== 'application/pdf') {
      alert('Please select a valid PDF file');
      event.target.value = '';
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('PDF file is too large. Maximum size is 50MB.');
      event.target.value = '';
      return;
    }

    setIsLoadingFile(true);
    setImportedFile(null);
    setImportedPageCount(null);

    try {
      const arrayBuffer = await file.arrayBuffer();

      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;

      if (pdf.numPages === 0) {
        throw new Error('PDF has no pages');
      }

      setImportedFile(file);
      setImportedPageCount(pdf.numPages);
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`Failed to load PDF: ${errorMessage}\n\nPlease ensure the file is a valid, non-corrupted PDF.`);
      setImportedFile(null);
      setImportedPageCount(null);
      event.target.value = '';
    } finally {
      setIsLoadingFile(false);
    }
  };

  const clearImportedFile = () => {
    setImportedFile(null);
    setImportedPageCount(null);
  };

  const handleSplit = async () => {
    setIsSplitting(true);
    try {
      if (importedFile && onImportAndSplit) {
        if (splitMethod === 'pages') {
          await onImportAndSplit(importedFile, 'pages', { splitPages });
        } else {
          await onImportAndSplit(importedFile, 'every-n', { everyNPages: parseInt(everyNPages, 10) });
        }
      } else {
        if (splitMethod === 'pages') {
          await onSplit('pages', { splitPages });
        } else {
          await onSplit('every-n', { everyNPages: parseInt(everyNPages, 10) });
        }
      }
      onClose();
      setImportedFile(null);
      setImportedPageCount(null);
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
          {onImportAndSplit && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50">
              <div className="text-center">
                {!importedFile ? (
                  <>
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-slate-900 mb-2">
                      Import a PDF to Split
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Upload a PDF file to split it into multiple files
                    </p>
                    <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileImport}
                        className="hidden"
                        disabled={isLoadingFile}
                      />
                      {isLoadingFile ? 'Loading...' : 'Choose PDF File'}
                    </label>
                  </>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div className="text-left">
                          <p className="font-medium text-green-900 text-sm">{importedFile.name}</p>
                          <p className="text-xs text-green-700">
                            {importedPageCount} pages • {(importedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={clearImportedFile}
                        className="text-green-600 hover:text-green-800 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-slate-600 mb-4">
              {importedFile
                ? `Imported PDF has ${importedPageCount} pages`
                : `Current PDF has ${pageCount} pages`
              }
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
                      max={importedPageCount || pageCount}
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
                <li>• File 3: Pages 11-{importedPageCount || pageCount}</li>
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
                <strong>{Math.ceil((importedPageCount || pageCount) / parseInt(everyNPages || '1'))}</strong>{' '}
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
              isLoadingFile ||
              (importedFile && !importedPageCount) ||
              (!importedFile && pageCount === 0) ||
              (splitMethod === 'pages' && !splitPages.trim()) ||
              (splitMethod === 'every-n' && !everyNPages)
            }
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSplitting ? 'Splitting...' : isLoadingFile ? 'Loading...' : 'Split PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
