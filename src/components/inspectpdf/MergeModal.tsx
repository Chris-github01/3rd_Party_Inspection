import { useState } from 'react';
import { X, Upload, FileText, Trash2 } from 'lucide-react';

interface PDFFile {
  id: string;
  file: File;
  pageRange?: string;
}

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: (files: PDFFile[]) => Promise<void>;
}

export function MergeModal({ isOpen, onClose, onMerge }: MergeModalProps) {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfOnly = files.filter(f => f.type === 'application/pdf');

    const newFiles: PDFFile[] = pdfOnly.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      pageRange: '',
    }));

    setPdfFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (id: string) => {
    setPdfFiles(prev => prev.filter(f => f.id !== id));
  };

  const handlePageRangeChange = (id: string, pageRange: string) => {
    setPdfFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, pageRange } : f))
    );
  };

  const handleMerge = async () => {
    if (pdfFiles.length < 2) {
      alert('Please select at least 2 PDF files to merge');
      return;
    }

    setIsMerging(true);
    try {
      await onMerge(pdfFiles);
      setPdfFiles([]);
      onClose();
    } catch (error) {
      console.error('Merge failed:', error);
      alert('Failed to merge PDFs. Please try again.');
    } finally {
      setIsMerging(false);
    }
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...pdfFiles];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newFiles.length) return;

    [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
    setPdfFiles(newFiles);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Merge PDFs</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <label className="block w-full">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium mb-1">
                  Click to upload PDFs or drag and drop
                </p>
                <p className="text-sm text-slate-500">
                  Select the PDF files you want to merge together
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Only the files you upload here will be merged
                </p>
                <input
                  type="file"
                  multiple
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </label>
          </div>

          {pdfFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-slate-900 mb-3">
                Files to merge ({pdfFiles.length})
              </h3>

              {pdfFiles.map((pdfFile, index) => (
                <div
                  key={pdfFile.id}
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate mb-2">
                        {index + 1}. {pdfFile.file.name}
                      </div>
                      <div className="text-sm text-slate-500 mb-3">
                        {(pdfFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Page Range (optional)
                        </label>
                        <input
                          type="text"
                          value={pdfFile.pageRange}
                          onChange={(e) =>
                            handlePageRangeChange(pdfFile.id, e.target.value)
                          }
                          placeholder="e.g., 1-10, 15, 20-"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Leave blank to include all pages
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => moveFile(index, 'up')}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveFile(index, 'down')}
                        disabled={index === pdfFiles.length - 1}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => handleRemoveFile(pdfFile.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pdfFiles.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Page Range Examples:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• <code className="bg-blue-100 px-1 rounded">1-10</code> = Pages 1 through 10</li>
                <li>• <code className="bg-blue-100 px-1 rounded">1,5,10</code> = Pages 1, 5, and 10</li>
                <li>• <code className="bg-blue-100 px-1 rounded">5-</code> = Page 5 to end</li>
                <li>• <code className="bg-blue-100 px-1 rounded">-10</code> = Start to page 10</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isMerging}
            className="px-4 py-2 text-slate-700 hover:text-slate-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={pdfFiles.length < 2 || isMerging}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isMerging ? 'Merging...' : 'Merge PDFs'}
          </button>
        </div>
      </div>
    </div>
  );
}
