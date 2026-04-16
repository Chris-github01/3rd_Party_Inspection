import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  ChevronRight,
  Building2,
  Layers,
  FileImage,
  Trash2,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import {
  fetchBlocks,
  createBlock,
  deleteBlock,
  fetchLevels,
  createLevel,
  deleteLevel,
  fetchDrawings,
  uploadDrawing,
  deleteDrawing,
} from '../../services/spatialService';
import type {
  InspectionAIProject,
  InspectionAIBlock,
  InspectionAILevel,
  InspectionAIDrawing,
} from '../../types';
import { format } from 'date-fns';

// ─── Inline add field ────────────────────────
function AddField({
  placeholder,
  onAdd,
  onCancel,
}: {
  placeholder: string;
  onAdd: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onAdd(value.trim());
      setValue('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') onCancel(); }}
        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 placeholder-slate-300"
      />
      <button
        onClick={handleAdd}
        disabled={!value.trim() || saving}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 text-white disabled:opacity-40 hover:bg-slate-800 transition-colors flex-shrink-0"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button
        onClick={onCancel}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Drawings panel (per level) ──────────────
function DrawingsPanel({
  level,
  onSelectDrawing,
  onBack,
}: {
  level: InspectionAILevel;
  onSelectDrawing: (d: InspectionAIDrawing) => void;
  onBack: () => void;
}) {
  const [drawings, setDrawings] = useState<InspectionAIDrawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDrawings(level.id)
      .then(setDrawings)
      .finally(() => setLoading(false));
  }, [level.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const drawing = await uploadDrawing(file, level.id, file.name.replace(/\.[^.]+$/, ''));
      setDrawings((prev) => [...prev, drawing]);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDrawing(id);
    setDrawings((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm">{level.name}</p>
          <p className="text-xs text-slate-400">Drawings</p>
        </div>
        <label className={`flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Upload
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : drawings.length === 0 ? (
          <div className="text-center py-12 px-6">
            <FileImage className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-600 text-sm">No drawings yet</p>
            <p className="text-xs text-slate-400 mt-1">Upload a floor plan or structural drawing to place pins</p>
          </div>
        ) : (
          drawings.map((drawing) => (
            <div
              key={drawing.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors group"
            >
              <button
                onClick={() => onSelectDrawing(drawing)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                  {drawing.file_type === 'image' ? (
                    <img src={drawing.file_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 text-sm truncate">{drawing.name}</p>
                  <p className="text-xs text-slate-400">{format(new Date(drawing.created_at), 'd MMM yyyy')}</p>
                </div>
              </button>
              <button
                onClick={() => handleDelete(drawing.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSelectDrawing(drawing)}
                className="text-slate-400 flex-shrink-0"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Levels panel (per block) ────────────────
function LevelsPanel({
  block,
  onSelectLevel,
  onBack,
}: {
  block: InspectionAIBlock;
  onSelectLevel: (l: InspectionAILevel) => void;
  onBack: () => void;
}) {
  const [levels, setLevels] = useState<InspectionAILevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchLevels(block.id)
      .then(setLevels)
      .finally(() => setLoading(false));
  }, [block.id]);

  const handleAdd = async (name: string) => {
    const level = await createLevel(block.id, name);
    setLevels((prev) => [...prev, level]);
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await deleteLevel(id);
    setLevels((prev) => prev.filter((l) => l.id !== id));
  };

  const COMMON_LEVELS = ['Ground Floor', 'Level 1', 'Level 2', 'Level 3', 'Roof', 'Basement', 'Mezzanine'];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm">{block.name}</p>
          <p className="text-xs text-slate-400">Levels</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Level
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {levels.length === 0 && !adding && (
              <div className="text-center py-10 px-6">
                <Layers className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="font-semibold text-slate-600 text-sm">No levels yet</p>
                <p className="text-xs text-slate-400 mt-1">Add levels to organise drawings by floor</p>
              </div>
            )}
            {levels.map((level) => (
              <div
                key={level.id}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors group"
              >
                <button
                  onClick={() => onSelectLevel(level)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Layers className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">{level.name}</p>
                </button>
                <button
                  onClick={() => handleDelete(level.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
              </div>
            ))}

            {!adding && levels.length === 0 && (
              <div className="px-4 py-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Quick add</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={async () => {
                        const level = await createLevel(block.id, l);
                        setLevels((prev) => [...prev, level]);
                      }}
                      className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {adding && (
        <AddField
          placeholder="Level name (e.g. Level 3)"
          onAdd={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
}

// ─── Main navigator ──────────────────────────
type NavScreen = 'blocks' | 'levels' | 'drawings';

export function BlockLevelNavigator({
  project,
  onSelectDrawing,
  onBack,
}: {
  project: InspectionAIProject;
  onSelectDrawing: (drawing: InspectionAIDrawing, level: InspectionAILevel, block: InspectionAIBlock) => void;
  onBack: () => void;
}) {
  const [navScreen, setNavScreen] = useState<NavScreen>('blocks');
  const [blocks, setBlocks] = useState<InspectionAIBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<InspectionAIBlock | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<InspectionAILevel | null>(null);

  useEffect(() => {
    fetchBlocks(project.id)
      .then(setBlocks)
      .finally(() => setLoading(false));
  }, [project.id]);

  const handleAddBlock = async (name: string) => {
    const block = await createBlock(project.id, name);
    setBlocks((prev) => [...prev, block]);
    setAdding(false);
  };

  const handleDeleteBlock = async (id: string) => {
    await deleteBlock(id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  if (navScreen === 'levels' && selectedBlock) {
    return (
      <LevelsPanel
        block={selectedBlock}
        onSelectLevel={(level) => {
          setSelectedLevel(level);
          setNavScreen('drawings');
        }}
        onBack={() => { setNavScreen('blocks'); setSelectedBlock(null); }}
      />
    );
  }

  if (navScreen === 'drawings' && selectedBlock && selectedLevel) {
    return (
      <DrawingsPanel
        level={selectedLevel}
        onSelectDrawing={(drawing) => onSelectDrawing(drawing, selectedLevel, selectedBlock)}
        onBack={() => { setNavScreen('levels'); setSelectedLevel(null); }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{project.project_name}</p>
          <p className="text-xs text-slate-400">Site Structure</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Block
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {blocks.length === 0 && !adding && (
              <div className="text-center py-12 px-6">
                <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="font-semibold text-slate-600 text-sm">No blocks yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add a block or zone (e.g. "Block A", "Tower 1") to start organising drawings
                </p>
              </div>
            )}
            {blocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors group"
              >
                <button
                  onClick={() => { setSelectedBlock(block); setNavScreen('levels'); }}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">{block.name}</p>
                </button>
                <button
                  onClick={() => handleDeleteBlock(block.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
              </div>
            ))}
          </>
        )}
      </div>

      {adding && (
        <AddField
          placeholder="Block name (e.g. Block A)"
          onAdd={handleAddBlock}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
}
