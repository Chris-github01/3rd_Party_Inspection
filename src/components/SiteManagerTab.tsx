import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, Upload, FileImage, Trash2, MoreVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AddBlockModal } from './site-manager/AddBlockModal';
import { AddLevelModal } from './site-manager/AddLevelModal';
import { UploadDrawingModal } from './site-manager/UploadDrawingModal';
import { DrawingViewer } from './site-manager/DrawingViewer';
import { ConfirmDialog } from './ConfirmDialog';

interface Block {
  id: string;
  name: string;
  description: string;
  levels: Level[];
}

interface Level {
  id: string;
  block_id: string;
  name: string;
  description: string;
  order_index: number;
  drawings: Drawing[];
}

interface Drawing {
  id: string;
  level_id: string;
  document_id: string;
  page_number: number;
  preview_image_path: string;
  scale_factor: number;
  created_at: string;
}

interface SiteManagerTabProps {
  projectId: string;
}

export function SiteManagerTab({ projectId }: SiteManagerTabProps) {
  const { canManageStructure } = useAuth();
  const { showToast } = useToast();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddLevel, setShowAddLevel] = useState(false);
  const [showUploadDrawing, setShowUploadDrawing] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [selectedDrawingContext, setSelectedDrawingContext] = useState<{
    blockName: string;
    levelName: string;
  } | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [drawingToDelete, setDrawingToDelete] = useState<Drawing | null>(null);
  const [deletingDrawing, setDeletingDrawing] = useState(false);
  const [openMenuDrawingId, setOpenMenuDrawingId] = useState<string | null>(null);

  useEffect(() => {
    loadProjectInfo();
    loadSiteStructure();
  }, [projectId]);

  const loadProjectInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      if (data) setProjectName(data.name);
    } catch (error) {
      console.error('Error loading project info:', error);
    }
  };

  const loadSiteStructure = async () => {
    setLoading(true);
    try {
      const { data: blocksData, error: blocksError } = await supabase
        .from('blocks')
        .select('*')
        .eq('project_id', projectId)
        .order('name');

      if (blocksError) throw blocksError;

      const blocksWithLevels = await Promise.all(
        (blocksData || []).map(async (block) => {
          const { data: levelsData, error: levelsError } = await supabase
            .from('levels')
            .select('*')
            .eq('block_id', block.id)
            .order('order_index');

          if (levelsError) throw levelsError;

          const levelsWithDrawings = await Promise.all(
            (levelsData || []).map(async (level) => {
              const { data: drawingsData, error: drawingsError } = await supabase
                .from('drawings')
                .select(`
                  *,
                  documents!inner(storage_path, filename)
                `)
                .eq('level_id', level.id)
                .is('deleted_at', null)
                .order('created_at');

              if (drawingsError) throw drawingsError;

              const mappedDrawings = (drawingsData || []).map((d: any) => ({
                id: d.id,
                level_id: d.level_id,
                document_id: d.document_id,
                page_number: d.page_number,
                preview_image_path: d.documents.storage_path,
                scale_factor: d.scale_factor || 1,
                created_at: d.created_at,
              }));

              return {
                ...level,
                drawings: mappedDrawings,
              };
            })
          );

          return {
            ...block,
            levels: levelsWithDrawings,
          };
        })
      );

      setBlocks(blocksWithLevels);
    } catch (error) {
      console.error('Error loading site structure:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = (blockId: string) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(blockId)) {
      newExpanded.delete(blockId);
    } else {
      newExpanded.add(blockId);
    }
    setExpandedBlocks(newExpanded);
  };

  const handleAddLevel = (blockId: string) => {
    setSelectedBlockId(blockId);
    setShowAddLevel(true);
  };

  const handleUploadDrawing = (levelId: string) => {
    setSelectedLevelId(levelId);
    setShowUploadDrawing(true);
  };

  const handleDrawingClick = (drawing: Drawing, blockName: string, levelName: string) => {
    setSelectedDrawing(drawing);
    setSelectedDrawingContext({ blockName, levelName });
  };

  const handleDeleteClick = (drawing: Drawing, e: React.MouseEvent) => {
    e.stopPropagation();
    setDrawingToDelete(drawing);
    setShowDeleteDialog(true);
    setOpenMenuDrawingId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!drawingToDelete) return;

    setDeletingDrawing(true);

    try {
      // Call the soft delete function
      const { data, error } = await supabase.rpc('soft_delete_drawing', {
        p_drawing_id: drawingToDelete.id,
      });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      // Check if the function returned success
      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          showToast('success', 'Drawing moved to trash. It can be restored within 30 days.');

          // Close the drawing viewer if this drawing was selected
          if (selectedDrawing?.id === drawingToDelete.id) {
            setSelectedDrawing(null);
            setSelectedDrawingContext(null);
          }

          // Close the dialog first
          setShowDeleteDialog(false);
          setDrawingToDelete(null);

          // Reload the site structure to reflect changes
          await loadSiteStructure();
        } else {
          throw new Error(data.message || 'Failed to delete drawing');
        }
      } else {
        // If data format is unexpected, still try to reload
        console.warn('Unexpected response format:', data);
        showToast('success', 'Drawing moved to trash. It can be restored within 30 days.');

        if (selectedDrawing?.id === drawingToDelete.id) {
          setSelectedDrawing(null);
          setSelectedDrawingContext(null);
        }

        setShowDeleteDialog(false);
        setDrawingToDelete(null);
        await loadSiteStructure();
      }
    } catch (error: any) {
      console.error('Error deleting drawing:', error);
      showToast('error', error.message || 'Failed to delete drawing. Please try again.');
    } finally {
      setDeletingDrawing(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDrawingToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-white/10 bg-white/10 backdrop-blur-sm overflow-y-auto">
        <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-10">
          <h3 className="text-lg font-semibold text-white mb-3">Site Structure</h3>
          {canManageStructure() ? (
            <button
              onClick={() => setShowAddBlock(true)}
              className="flex items-center gap-2 w-full px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              Add Block
            </button>
          ) : (
            <div className="text-xs text-blue-200 bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <p className="font-medium text-white mb-1">Field Inspector Mode</p>
              <p>Select a drawing to place inspection pins and upload photos.</p>
            </div>
          )}
        </div>

        <div className="p-4">
          {blocks.length === 0 ? (
            <div className="text-center py-8 text-blue-200">
              <p className="text-sm">No blocks yet</p>
              <p className="text-xs mt-1">Create a block to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((block) => (
                <div key={block.id} className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                  <div
                    className="flex items-center gap-2 p-3 cursor-pointer hover:bg-white/10"
                    onClick={() => toggleBlock(block.id)}
                  >
                    {expandedBlocks.has(block.id) ? (
                      <ChevronDown className="w-4 h-4 text-blue-300" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-blue-300" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">{block.name}</h4>
                      {block.description && (
                        <p className="text-xs text-blue-200 truncate">{block.description}</p>
                      )}
                    </div>
                  </div>

                  {expandedBlocks.has(block.id) && (
                    <div className="px-3 pb-3 pl-8">
                      {canManageStructure() && (
                        <button
                          onClick={() => handleAddLevel(block.id)}
                          className="flex items-center gap-1 text-xs text-primary-300 hover:underline mb-2"
                        >
                          <Plus className="w-3 h-3" />
                          Add Level
                        </button>
                      )}

                      {block.levels.length === 0 ? (
                        <p className="text-xs text-blue-200 py-2">No levels yet</p>
                      ) : (
                        <div className="space-y-2">
                          {block.levels.map((level) => (
                            <div
                              key={level.id}
                              className="bg-white/5 backdrop-blur-sm rounded p-2 border border-white/10"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-sm font-medium text-white truncate">
                                    {level.name}
                                  </h5>
                                  <p className="text-xs text-blue-200 mt-1">
                                    {level.drawings.length} drawing
                                    {level.drawings.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                {canManageStructure() && (
                                  <button
                                    onClick={() => handleUploadDrawing(level.id)}
                                    className="p-1 text-primary-300 hover:bg-white/10 rounded"
                                    title="Upload drawing"
                                  >
                                    <Upload className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {level.drawings.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {level.drawings.map((drawing) => (
                                    <div key={drawing.id} className="relative group">
                                      <button
                                        onClick={() => handleDrawingClick(drawing, block.name, level.name)}
                                        className="flex items-center gap-2 w-full p-2 text-left hover:bg-white/10 rounded text-xs"
                                      >
                                        <FileImage className="w-3 h-3 text-blue-300" />
                                        <span className="text-white flex-1">
                                          Drawing {drawing.page_number || 1}
                                        </span>
                                      </button>
                                      {canManageStructure() && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteClick(drawing, e)}
                                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Delete drawing"
                                          aria-label="Delete drawing"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-slate-900">
        {selectedDrawing ? (
          <DrawingViewer
            drawing={selectedDrawing}
            projectId={projectId}
            projectName={projectName}
            blockName={selectedDrawingContext?.blockName}
            levelName={selectedDrawingContext?.levelName}
            onClose={() => {
              setSelectedDrawing(null);
              setSelectedDrawingContext(null);
            }}
            onPinAdded={loadSiteStructure}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-blue-200">
            <div className="text-center">
              <FileImage className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-medium text-white">No drawing selected</p>
              <p className="text-sm mt-1">Select a drawing from the left panel to view</p>
            </div>
          </div>
        )}
      </div>

      <AddBlockModal
        isOpen={showAddBlock}
        projectId={projectId}
        onClose={() => setShowAddBlock(false)}
        onSuccess={() => {
          setShowAddBlock(false);
          loadSiteStructure();
        }}
      />

      <AddLevelModal
        isOpen={showAddLevel}
        blockId={selectedBlockId}
        onClose={() => {
          setShowAddLevel(false);
          setSelectedBlockId('');
        }}
        onSuccess={() => {
          setShowAddLevel(false);
          setSelectedBlockId('');
          loadSiteStructure();
        }}
      />

      <UploadDrawingModal
        isOpen={showUploadDrawing}
        levelId={selectedLevelId}
        projectId={projectId}
        onClose={() => {
          setShowUploadDrawing(false);
          setSelectedLevelId('');
        }}
        onSuccess={() => {
          setShowUploadDrawing(false);
          setSelectedLevelId('');
          loadSiteStructure();
        }}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Drawing?"
        message="This drawing will be moved to trash and can be restored within 30 days. All pins on this drawing will be preserved."
        confirmLabel="Move to Trash"
        cancelLabel="Cancel"
        variant="danger"
        icon="trash"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deletingDrawing}
      />
    </div>
  );
}
