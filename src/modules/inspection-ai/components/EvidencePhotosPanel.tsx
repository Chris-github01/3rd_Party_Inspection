import { useState, useRef } from 'react';
import { Plus, Trash2, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadEvidenceImage, addItemImage, deleteItemImage } from '../services/storageService';
import type { InspectionAIItemImage } from '../types';

interface Props {
  itemId: string;
  images: InspectionAIItemImage[];
  onImagesChange: (images: InspectionAIItemImage[]) => void;
  disabled?: boolean;
}

export function EvidencePhotosPanel({ itemId, images, onImagesChange, disabled }: Props) {
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0 || !itemId) return;

    setUploading(true);
    try {
      const newImages: InspectionAIItemImage[] = [];
      for (const file of files) {
        const url = await uploadEvidenceImage(file, itemId);
        const saved = await addItemImage(itemId, url, '', images.length + newImages.length);
        newImages.push(saved);
      }
      onImagesChange([...images, ...newImages]);
    } catch (err) {
      console.error('Evidence upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (img: InspectionAIItemImage) => {
    setDeletingId(img.id);
    try {
      await deleteItemImage(img.id);
      onImagesChange(images.filter((i) => i.id !== img.id));
    } catch (err) {
      console.error('Delete evidence error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Evidence Photos
            {images.length > 0 && (
              <span className="ml-1.5 text-slate-400 normal-case font-medium">({images.length})</span>
            )}
          </span>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-400 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Add Photo
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {images.length === 0 && !uploading && (
        <p className="text-xs text-slate-400 italic">No evidence photos yet.</p>
      )}

      {(images.length > 0 || uploading) && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={img.image_url}
                alt={img.caption || 'Evidence photo'}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightboxUrl(img.image_url)}
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleDelete(img)}
                  disabled={deletingId === img.id}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >
                  {deletingId === img.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          ))}
          {uploading && (
            <div className="aspect-square rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          )}
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Evidence photo"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
