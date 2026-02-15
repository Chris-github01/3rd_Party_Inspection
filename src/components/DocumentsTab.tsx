import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, File, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Document {
  id: string;
  type: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  uploaded_at: string;
}

const DOCUMENT_TYPES = [
  { value: 'drawing', label: 'Drawing' },
  { value: 'fire_schedule', label: 'Fire Schedule' },
  { value: 'steel_schedule', label: 'Steel Schedule' },
  { value: 'pds', label: 'PDS (Product Data Sheet)' },
  { value: 'sds', label: 'SDS (Safety Data Sheet)' },
  { value: 'other', label: 'Other' },
];

export function DocumentsTab({ projectId }: { projectId: string }) {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('drawing');

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('documents').insert({
        project_id: projectId,
        type: selectedType,
        filename: fileName,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: `documents/${fileName}`,
      });

      if (dbError) throw dbError;

      await loadDocuments();
      e.target.value = '';
    } catch (error: any) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.filename]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      await loadDocuments();
    } catch (error: any) {
      alert('Error deleting document: ' + error.message);
    }
  };

  const getPublicUrl = (doc: Document) => {
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(doc.filename);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const canEdit = profile?.role === 'admin' || profile?.role === 'inspector';

  if (loading) {
    return <div className="text-center py-8">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload Document</h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Document Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select File
              </label>
              <label className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                <Upload className="w-5 h-5 mr-2 text-slate-600" />
                <span className="text-sm text-slate-600">
                  {uploading ? 'Uploading...' : 'Choose file'}
                </span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Documents</h3>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No documents uploaded yet
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {documents.map((doc) => {
              const typeLabel =
                DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || doc.type;

              return (
                <div key={doc.id} className="px-6 py-4 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <File className="w-8 h-8 text-blue-600 mr-3" />
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{doc.original_name}</h4>
                        <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {typeLabel}
                          </span>
                          <span>{formatFileSize(doc.size_bytes)}</span>
                          <span>{format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={getPublicUrl(doc)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </a>
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
