import { useState, useEffect } from 'react';
import { Download, Trash2, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';

interface GeneratedFile {
  id: string;
  filename: string;
  file_path: string;
  file_size_bytes: number;
  page_count: number;
  operation_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface GeneratedFilesPanelProps {
  workspaceId: string;
}

export function GeneratedFilesPanel({ workspaceId }: GeneratedFilesPanelProps) {
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadGeneratedFiles();
  }, [workspaceId]);

  const loadGeneratedFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('pdf_generated_files')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error loading generated files:', error);
      showToast('Failed to load generated files', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (file: GeneratedFile) => {
    setDownloadingId(file.id);
    try {
      const { data, error } = await supabase.storage
        .from('pdf-generated-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('File downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading file:', error);
      showToast('Failed to download file', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (file: GeneratedFile) => {
    if (!confirm(`Are you sure you want to delete "${file.filename}"?`)) {
      return;
    }

    setDeletingId(file.id);
    try {
      const { error: storageError } = await supabase.storage
        .from('pdf-generated-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('pdf_generated_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      setFiles(files.filter(f => f.id !== file.id));
      showToast('File deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting file:', error);
      showToast('Failed to delete file', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getOperationLabel = (type: string): string => {
    const labels: Record<string, string> = {
      merge: 'Merged PDF',
      split: 'Split PDF',
      rotate: 'Rotated PDF',
      extract: 'Extracted Pages',
      mix: 'Mixed PDF',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No generated files yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Files created from operations will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Generated Files</h3>

      {files.map((file) => (
        <div
          key={file.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <h4 className="font-medium text-gray-900 truncate">
                  {file.filename}
                </h4>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  {getOperationLabel(file.operation_type)}
                </span>
                <span>{formatFileSize(file.file_size_bytes)}</span>
                {file.page_count > 0 && (
                  <span>{file.page_count} pages</span>
                )}
              </div>

              <p className="text-xs text-gray-400">
                Created {format(new Date(file.created_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleDownload(file)}
                disabled={downloadingId === file.id}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                title="Download file"
              >
                {downloadingId === file.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={() => handleDelete(file)}
                disabled={deletingId === file.id}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete file"
              >
                {deletingId === file.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
