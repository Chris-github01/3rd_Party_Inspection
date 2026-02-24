import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, File, Trash2, Eye, Grid, ChevronRight, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { CreateBlockLevelModal } from './CreateBlockLevelModal';

interface Document {
  id: string;
  type: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  created_at: string;
}

interface Block {
  id: string;
  name: string;
  description: string;
  created_at: string;
  levels: Level[];
}

interface Level {
  id: string;
  name: string;
  description: string;
  order_index: number;
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
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('drawing');
  const [showCreateBlockModal, setShowCreateBlockModal] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDocuments();
    loadBlocks();
  }, [projectId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBlocks = async () => {
    try {
      const { data: blocksData, error: blocksError } = await supabase
        .from('blocks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (blocksError) throw blocksError;

      if (blocksData && blocksData.length > 0) {
        const { data: levelsData, error: levelsError } = await supabase
          .from('levels')
          .select('*')
          .in('block_id', blocksData.map(b => b.id))
          .order('order_index', { ascending: true });

        if (levelsError) throw levelsError;

        const blocksWithLevels = blocksData.map(block => ({
          ...block,
          levels: (levelsData || []).filter(l => l.block_id === block.id)
        }));

        setBlocks(blocksWithLevels);
      } else {
        setBlocks([]);
      }
    } catch (error) {
      console.error('Error loading blocks:', error);
    }
  };

  const toggleBlockExpand = (blockId: string) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(blockId)) {
      newExpanded.delete(blockId);
    } else {
      newExpanded.add(blockId);
    }
    setExpandedBlocks(newExpanded);
  };

  const handleBlockCreated = () => {
    loadBlocks();
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
      {!canEdit && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
          <p className="text-yellow-200 text-sm">
            <strong>Note:</strong> You need admin or inspector role to upload documents.
            Current role: {profile?.role || 'none'} | User: {profile?.name || 'unknown'}
          </p>
        </div>
      )}

      {canEdit && (
        <>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Upload Document</h3>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Document Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Select File
                </label>
                <label className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-700 transition-colors">
                  <Upload className="w-5 h-5 mr-2 text-slate-400" />
                  <span className="text-sm text-slate-300">
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

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Project Structure</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Define blocks and levels for spatial organization
                </p>
              </div>
              <button
                onClick={() => setShowCreateBlockModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Grid className="w-4 h-4" />
                Create Block & Levels
              </button>
            </div>

            {blocks.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-600 rounded-lg">
                <Grid className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">
                  No blocks created yet. Click the button above to create your first block.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleBlockExpand(block.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Grid className="w-5 h-5 text-green-400" />
                        <div className="text-left">
                          <div className="font-medium text-white">{block.name}</div>
                          {block.description && (
                            <div className="text-sm text-slate-400 mt-0.5">
                              {block.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400">
                          {block.levels.length} level{block.levels.length !== 1 ? 's' : ''}
                        </span>
                        {expandedBlocks.has(block.id) ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {expandedBlocks.has(block.id) && (
                      <div className="px-4 pb-3 space-y-2">
                        {block.levels.map((level, index) => (
                          <div
                            key={level.id}
                            className="flex items-center gap-3 px-4 py-2 bg-slate-800 rounded border border-slate-600"
                          >
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-white">
                                {level.name}
                              </div>
                              {level.description && (
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {level.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Documents</h3>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No documents uploaded yet
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {documents.map((doc) => {
              const typeLabel =
                DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || doc.type;

              return (
                <div key={doc.id} className="px-6 py-4 hover:bg-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <File className="w-8 h-8 text-blue-400 mr-3" />
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{doc.original_name}</h4>
                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                            {typeLabel}
                          </span>
                          <span>{formatFileSize(doc.size_bytes)}</span>
                          <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={getPublicUrl(doc)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-400 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </a>
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-2 text-red-400 hover:bg-white/10 rounded-lg transition-colors"
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

      {showCreateBlockModal && (
        <CreateBlockLevelModal
          projectId={projectId}
          onClose={() => setShowCreateBlockModal(false)}
          onSuccess={handleBlockCreated}
        />
      )}
    </div>
  );
}
