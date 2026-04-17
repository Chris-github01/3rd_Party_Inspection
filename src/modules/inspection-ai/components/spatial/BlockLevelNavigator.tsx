import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  ChevronRight,
  Building2,
  Layers,
  FileImage,
  FileText,
  Trash2,
  Loader2,
  X,
  Check,
  AlertCircle,
  Sparkles,
  Pencil,
  CheckSquare,
  Square,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { ACCEPTED_MIME_TYPES, ACCEPTED_EXTENSIONS, getFileKind } from '../../utils/fileRenderer';
import type { ImageCategory } from '../../types';
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
  bulkOverrideCategory,
} from '../../services/spatialService';
import type {
  InspectionAIProject,
  InspectionAIBlock,
  InspectionAILevel,
  InspectionAIDrawing,
} from '../../types';
import { format } from 'date-fns';

const CATEGORY_BADGE_STYLE: Record<ImageCategory, string> = {
  drawing:        'bg-sky-700/80 text-white',
  site_photo:     'bg-emerald-700/80 text-white',
  defect_closeup: 'bg-red-700/80 text-white',
  document_scan:  'bg-sky-600/80 text-white',
  screenshot:     'bg-slate-700/80 text-white',
  mixed_content:  'bg-amber-700/80 text-white',
  unknown:        'bg-slate-600/80 text-white',
};

const CATEGORY_SHORT: Record<ImageCategory, string> = {
  drawing:        'Plan',
  site_photo:     'Site',
  defect_closeup: 'Defect',
  document_scan:  'Doc',
  screenshot:     'Screen',
  mixed_content:  'Mixed',
  unknown:        '?',
};

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

interface UploadJob {
  id: string;
  name: string;
  status: 'pending' | 'converting' | 'uploading' | 'done' | 'error';
  phase?: string;
  error?: string;
}

function UploadProgressBar({ jobs }: { jobs: UploadJob[] }) {
  if (jobs.length === 0) return null;
  const done = jobs.filter((j) => j.status === 'done').length;
  const errored = jobs.filter((j) => j.status === 'error').length;
  const pct = Math.round((done / jobs.length) * 100);
  return (
    <div className="mx-4 mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-700">
          Uploading {jobs.length} file{jobs.length !== 1 ? 's' : ''}…
        </span>
        <span className="text-xs text-slate-500">{done}/{jobs.length}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
        <div
          className="bg-slate-900 rounded-full h-1.5 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="space-y-1.5 max-h-28 overflow-y-auto">
        {jobs.map((j) => (
          <div key={j.id} className="flex items-center gap-2">
            {j.status === 'done' && <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
            {j.status === 'error' && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
            {(j.status === 'pending' || j.status === 'uploading' || j.status === 'converting') && (
              <Loader2 className="w-3 h-3 text-slate-400 animate-spin flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <span className={`text-[11px] truncate block ${j.status === 'error' ? 'text-red-500' : 'text-slate-600'}`}>
                {j.name}
              </span>
              {j.phase && j.status !== 'done' && j.status !== 'error' && (
                <span className="text-[10px] text-amber-600 font-medium block">{j.phase}</span>
              )}
              {j.error && <span className="text-[10px] text-red-400 block truncate">{j.error}</span>}
            </div>
          </div>
        ))}
      </div>
      {errored > 0 && (
        <p className="text-[10px] text-red-500 mt-1.5 font-medium">{errored} file{errored > 1 ? 's' : ''} failed</p>
      )}
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
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkOverriding, setBulkOverriding] = useState(false);
  const bulkMenuRef = { current: null as HTMLDivElement | null };

  const isUploading = uploadJobs.some((j) => j.status === 'pending' || j.status === 'uploading');

  useEffect(() => {
    fetchDrawings(level.id)
      .then(setDrawings)
      .finally(() => setLoading(false));
  }, [level.id]);

  useEffect(() => {
    if (uploadJobs.length > 0 && uploadJobs.every((j) => j.status === 'done' || j.status === 'error')) {
      const timer = setTimeout(() => setUploadJobs([]), 2500);
      return () => clearTimeout(timer);
    }
  }, [uploadJobs]);

  const processFiles = async (files: File[]) => {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const kind = getFileKind(file);
      if (!kind) {
        errors.push(`${file.name}: unsupported type`);
      } else {
        valid.push(file);
      }
    }

    if (errors.length > 0) {
      setUploadError(errors.join(', '));
    }

    if (valid.length === 0) return;

    const jobs: UploadJob[] = valid.map((f) => ({
      id: `${Date.now()}-${f.name}`,
      name: f.name,
      status: 'pending',
    }));
    setUploadJobs(jobs);

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      const isHeicFile =
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heic') ||
        file.name.toLowerCase().endsWith('.heif');

      setUploadJobs((prev) =>
        prev.map((j, idx) =>
          idx === i
            ? { ...j, status: isHeicFile ? 'converting' : 'uploading', phase: isHeicFile ? 'Converting HEIC…' : 'Uploading…' }
            : j
        )
      );

      try {
        const drawing = await uploadDrawing(
          file,
          level.id,
          file.name.replace(/\.[^.]+$/, ''),
          1,
          (phase) => {
            const isConvertPhase =
              phase.toLowerCase().includes('convert') || phase.toLowerCase().includes('heic');
            setUploadJobs((prev) =>
              prev.map((j, idx) =>
                idx === i
                  ? { ...j, status: isConvertPhase ? 'converting' : 'uploading', phase }
                  : j
              )
            );
          }
        );
        setDrawings((prev) => [...prev, drawing]);
        setUploadJobs((prev) =>
          prev.map((j, idx) => (idx === i ? { ...j, status: 'done', phase: undefined } : j))
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setUploadJobs((prev) =>
          prev.map((j, idx) => (idx === i ? { ...j, status: 'error', error: msg, phase: undefined } : j))
        );
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) processFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) processFiles(files);
  };

  const handleDelete = async (id: string) => {
    await deleteDrawing(id);
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const imageDrawings = drawings.filter(d => d.file_type === 'image');
    if (selected.size === imageDrawings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(imageDrawings.map(d => d.id)));
    }
  };

  const handleBulkOverride = async (category: ImageCategory) => {
    setBulkMenuOpen(false);
    setBulkOverriding(true);
    const ids = Array.from(selected);
    const drawingMap = Object.fromEntries(
      drawings.filter(d => ids.includes(d.id)).map(d => [
        d.id,
        { category: d.image_category, source: d.image_category_source, confidence: d.image_category_confidence },
      ])
    );
    try {
      await bulkOverrideCategory(ids, category, drawingMap);
      setDrawings(prev => prev.map(d =>
        ids.includes(d.id)
          ? { ...d, image_category: category, image_category_source: 'manual', image_category_confidence: 1.0, image_category_reason: 'Bulk override by user', image_category_pending_ai: false }
          : d
      ));
      setSelected(new Set());
    } finally {
      setBulkOverriding(false);
    }
  };

  const ACCEPT = ACCEPTED_MIME_TYPES.join(',') + ',' + ACCEPTED_EXTENSIONS.join(',');

  return (
    <div
      className="flex flex-col h-full"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm">{level.name}</p>
          <p className="text-xs text-slate-400">Drawings</p>
        </div>
        <label className={`flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Upload
          <input
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={handleFileInput}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Bulk override toolbar */}
      {drawings.some(d => d.file_type === 'image') && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            {selected.size === drawings.filter(d => d.file_type === 'image').length && selected.size > 0
              ? <CheckSquare className="w-3.5 h-3.5" />
              : <Square className="w-3.5 h-3.5" />}
            {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
          </button>

          {selected.size > 0 && (
            <div className="relative ml-auto" ref={el => { bulkMenuRef.current = el; }}>
              <button
                onClick={() => setBulkMenuOpen(v => !v)}
                disabled={bulkOverriding}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {bulkOverriding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3" />}
                Set category
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {bulkMenuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-[160px] overflow-hidden">
                  {(['drawing', 'site_photo', 'defect_closeup', 'document_scan', 'screenshot', 'mixed_content', 'unknown'] as ImageCategory[]).map(cat => {
                    const dotColors: Record<ImageCategory, string> = {
                      drawing: '#0ea5e9', site_photo: '#10b981', defect_closeup: '#ef4444',
                      document_scan: '#3b82f6', screenshot: '#6b7280', mixed_content: '#f59e0b', unknown: '#94a3b8',
                    };
                    return (
                      <button
                        key={cat}
                        onClick={() => handleBulkOverride(cat)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColors[cat] }} />
                        {CATEGORY_SHORT[cat]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-2 mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 font-medium flex-1">{uploadError}</p>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <UploadProgressBar jobs={uploadJobs} />

      <div className="flex-1 overflow-y-auto relative">
        {dragOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/10 backdrop-blur-sm border-2 border-dashed border-slate-400 rounded-lg m-3">
            <div className="text-center">
              <FileImage className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-sm">Drop files to upload</p>
              <p className="text-xs text-slate-400 mt-0.5">PDF, PNG, JPG, JPEG, WEBP, HEIC</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 animate-pulse">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : drawings.length === 0 ? (
          <label className="block cursor-pointer">
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                <FileImage className="w-7 h-7 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-600 text-sm">No drawings yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Drop files here or tap to upload
              </p>
              <p className="text-[10px] text-slate-300 mt-1">PDF · PNG · JPG · WEBP · HEIC</p>
            </div>
            <input type="file" accept={ACCEPT} multiple className="hidden" onChange={handleFileInput} />
          </label>
        ) : (
          drawings.map((drawing) => (
            <div
              key={drawing.id}
              className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors group ${selected.has(drawing.id) ? 'bg-sky-50/60' : ''}`}
            >
              {drawing.file_type === 'image' && (
                <button
                  onClick={() => toggleSelect(drawing.id)}
                  className="flex-shrink-0 text-slate-400 hover:text-sky-600 transition-colors"
                >
                  {selected.has(drawing.id)
                    ? <CheckSquare className="w-4 h-4 text-sky-600" />
                    : <Square className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => onSelectDrawing(drawing)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 relative">
                  {drawing.file_type === 'image' ? (
                    <>
                      <img
                        src={drawing.file_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                      {drawing.image_category_pending_ai ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      ) : drawing.image_category ? (
                        <span className={`absolute bottom-0 left-0 right-0 text-center text-[7px] font-bold uppercase leading-tight py-0.5 flex items-center justify-center gap-0.5 ${CATEGORY_BADGE_STYLE[drawing.image_category] ?? 'bg-slate-700/70 text-white'}`}>
                          {drawing.image_category_source === 'gemini' || drawing.image_category_source === 'openai' ? (
                            <Sparkles className="w-2 h-2 flex-shrink-0" />
                          ) : drawing.image_category_source === 'manual' ? (
                            <Pencil className="w-2 h-2 flex-shrink-0" />
                          ) : null}
                          {CATEGORY_SHORT[drawing.image_category] ?? drawing.image_category}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 bg-slate-100">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">PDF</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 text-sm truncate">{drawing.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-400">{format(new Date(drawing.created_at), 'd MMM yyyy')}</p>
                    {drawing.page_count > 1 && (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                        {drawing.page_count}p
                      </span>
                    )}
                    {drawing.image_category_pending_ai && (
                      <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />AI classifying
                      </span>
                    )}
                    {!drawing.image_category_pending_ai && (drawing.image_category_source === 'gemini' || drawing.image_category_source === 'openai') && (
                      <span className="text-[9px] text-sky-500 flex items-center gap-0.5 font-medium">
                        <Sparkles className="w-2.5 h-2.5" />AI verified
                      </span>
                    )}
                    {!drawing.image_category_pending_ai && drawing.image_category_source === 'manual' && (
                      <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                        <Pencil className="w-2.5 h-2.5" />Manual
                      </span>
                    )}
                  </div>
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
