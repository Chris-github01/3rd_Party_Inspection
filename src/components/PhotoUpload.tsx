import { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PhotoUploadProps {
  pinId: string;
  projectId: string;
  onPhotoAdded?: () => void;
  disabled?: boolean;
}

interface UploadedPhoto {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  caption: string;
  created_at: string;
  url?: string;
}

export function PhotoUpload({ pinId, projectId, onPhotoAdded, disabled }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pin_photos')
        .select('*')
        .eq('pin_id', pinId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const photosWithUrls = await Promise.all(
          data.map(async (photo) => {
            const { data: urlData } = await supabase.storage
              .from('pin-photos')
              .createSignedUrl(photo.file_path, 3600);

            return {
              ...photo,
              url: urlData?.signedUrl || '',
            };
          })
        );
        setPhotos(photosWithUrls);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (files: FileList | null, source: 'camera' | 'gallery') => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith('image/')) {
          console.warn('Skipping non-image file:', file.name);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${projectId}/${pinId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('pin-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from('pin_photos').insert({
          pin_id: pinId,
          project_id: projectId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          sort_order: photos.length + i,
          uploaded_by: userId,
        });

        if (dbError) throw dbError;
      }

      await loadPhotos();
      if (onPhotoAdded) onPhotoAdded();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      alert(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('pin-photos')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('pin_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) throw dbError;

      setPhotos(photos.filter(p => p.id !== photoId));
      if (onPhotoAdded) onPhotoAdded();
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      alert(error.message || 'Failed to delete photo');
    }
  };

  const handleUpdateCaption = async (photoId: string, caption: string) => {
    try {
      const { error } = await supabase
        .from('pin_photos')
        .update({ caption })
        .eq('id', photoId);

      if (error) throw error;

      setPhotos(photos.map(p => p.id === photoId ? { ...p, caption } : p));
    } catch (error: any) {
      console.error('Error updating caption:', error);
      alert(error.message || 'Failed to update caption');
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [pinId]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Camera className="w-5 h-5" />
          <span>Take Photo</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ImageIcon className="w-5 h-5" />
          <span>From Gallery</span>
        </button>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => handleFileSelect(e.target.files, 'camera')}
          className="hidden"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files, 'gallery')}
          className="hidden"
        />
      </div>

      {uploading && (
        <div className="flex items-center justify-center gap-2 py-4 text-primary-400">
          <Upload className="w-5 h-5 animate-pulse" />
          <span>Uploading photos...</span>
        </div>
      )}

      {loading && !uploading && (
        <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
          <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading photos...</span>
        </div>
      )}

      {photos.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-300">
            Uploaded Photos ({photos.length})
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group bg-slate-700 rounded-lg overflow-hidden border border-slate-600"
              >
                {photo.url && (
                  <img
                    src={photo.url}
                    alt={photo.file_name}
                    className="w-full h-32 object-cover"
                  />
                )}

                <button
                  type="button"
                  onClick={() => handleDeletePhoto(photo.id, photo.file_path)}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="p-2">
                  <input
                    type="text"
                    value={photo.caption || ''}
                    onChange={(e) => handleUpdateCaption(photo.id, e.target.value)}
                    placeholder="Add caption..."
                    className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 text-white rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    disabled={disabled}
                  />
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    {photo.file_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && !loading && !uploading && (
        <div className="text-center py-8 text-slate-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No photos yet</p>
          <p className="text-xs mt-1">Take a photo or select from gallery</p>
        </div>
      )}
    </div>
  );
}
