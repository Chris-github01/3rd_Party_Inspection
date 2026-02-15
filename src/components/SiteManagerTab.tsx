import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, Upload, FileImage } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AddBlockModal } from './site-manager/AddBlockModal';
import { AddLevelModal } from './site-manager/AddLevelModal';
import { UploadDrawingModal } from './site-manager/UploadDrawingModal';
import { DrawingViewer } from './site-manager/DrawingViewer';

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
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddLevel, setShowAddLevel] = useState(false);
  const [showUploadDrawing, setShowUploadDrawing] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);

  useEffect(() => {
    loadSiteStructure();
  }, [projectId]);

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
                .select('*')
                .eq('level_id', level.id)
                .order('created_at');

              if (drawingsError) throw drawingsError;

              return {
                ...level,
                drawings: drawingsData || [],
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

  const handleDrawingClick = (drawing: Drawing) => {
    setSelectedDrawing(drawing);
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
      <div className="w-80 border-r border-slate-200 bg-slate-50 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Site Structure</h3>
          <button
            onClick={() => setShowAddBlock(true)}
            className="flex items-center gap-2 w-full px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Add Block
          </button>
        </div>

        <div className="p-4">
          {blocks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No blocks yet</p>
              <p className="text-xs mt-1">Create a block to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((block) => (
                <div key={block.id} className="bg-white rounded-lg border border-slate-200">
                  <div
                    className="flex items-center gap-2 p-3 cursor-pointer hover:bg-slate-50"
                    onClick={() => toggleBlock(block.id)}
                  >
                    {expandedBlocks.has(block.id) ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate">{block.name}</h4>
                      {block.description && (
                        <p className="text-xs text-slate-500 truncate">{block.description}</p>
                      )}
                    </div>
                  </div>

                  {expandedBlocks.has(block.id) && (
                    <div className="px-3 pb-3 pl-8">
                      <button
                        onClick={() => handleAddLevel(block.id)}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:underline mb-2"
                      >
                        <Plus className="w-3 h-3" />
                        Add Level
                      </button>

                      {block.levels.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">No levels yet</p>
                      ) : (
                        <div className="space-y-2">
                          {block.levels.map((level) => (
                            <div
                              key={level.id}
                              className="bg-slate-50 rounded p-2 border border-slate-200"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-sm font-medium text-slate-900 truncate">
                                    {level.name}
                                  </h5>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {level.drawings.length} drawing
                                    {level.drawings.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleUploadDrawing(level.id)}
                                  className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                                  title="Upload drawing"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>
                              </div>

                              {level.drawings.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {level.drawings.map((drawing) => (
                                    <button
                                      key={drawing.id}
                                      onClick={() => handleDrawingClick(drawing)}
                                      className="flex items-center gap-2 w-full p-2 text-left hover:bg-white rounded text-xs"
                                    >
                                      <FileImage className="w-3 h-3 text-slate-400" />
                                      <span className="text-slate-700">
                                        Drawing {drawing.page_number || 1}
                                      </span>
                                    </button>
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

      <div className="flex-1 bg-white">
        {selectedDrawing ? (
          <DrawingViewer
            drawing={selectedDrawing}
            projectId={projectId}
            onClose={() => setSelectedDrawing(null)}
            onPinAdded={loadSiteStructure}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <FileImage className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-medium">No drawing selected</p>
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
    </div>
  );
}
