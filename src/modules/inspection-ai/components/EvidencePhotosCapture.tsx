import { useState, useRef } from 'react';
import { Camera, Upload, X, Plus, Image as ImageIcon, Loader2 } from 'lucide-react';

export interface EvidenceEntry {
  file: File;
  previewUrl: string;
  caption: string;
}

interface Props {
  entries: EvidenceEntry[];
  onChange: (entries: EvidenceEntry[]) => void;
  disabled?: boolean;
}

export function EvidencePhotosCapture({ entries, onChange, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    const newEntries: EvidenceEntry[] = [];
    let loaded = 0;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        newEntries.push({ file, previewUrl: e.target?.result as string, caption: '' });
        loaded++;
        if (loaded === files.length) {
          onChange([...entries, ...newEntries]);
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function removeEntry(index: number) {
    const next = entries.filter((_, i) => i !== index);
    onChange(next);
  }

  function updateCaption(index: number, caption: string) {
    const next = entries.map((e, i) => i === index ? { ...e, caption } : e);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Supporting Evidence Photos</p>
        <span className="text-[10px] text-slate-400">{entries.length} photo{entries.length !== 1 ? 's' : ''}</span>
      </div>

      {entries.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center">
          <ImageIcon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Add supporting photos</p>
          <p className="text-[10px] text-slate-300 mt-0.5">These will not be AI-analysed</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {entries.map((e, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <img src={e.previewUrl} alt="" className="w-full h-24 object-cover" />
              <button
                onClick={() => removeEntry(i)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <input
                type="text"
                value={e.caption}
                onChange={ev => updateCaption(i, ev.target.value)}
                placeholder="Caption (optional)"
                className="w-full px-2 py-1.5 text-[11px] text-slate-700 bg-white border-t border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (fileRef.current) {
              fileRef.current.setAttribute('capture', 'environment');
              fileRef.current.click();
            }
          }}
          disabled={disabled || uploading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          Camera
        </button>
        <button
          type="button"
          onClick={() => {
            if (fileRef.current) {
              fileRef.current.removeAttribute('capture');
              fileRef.current.click();
            }
          }}
          disabled={disabled || uploading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
        <button
          type="button"
          onClick={() => {
            if (fileRef.current) {
              fileRef.current.removeAttribute('capture');
              fileRef.current.click();
            }
          }}
          disabled={disabled || uploading}
          className="w-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
