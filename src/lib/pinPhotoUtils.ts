import { supabase } from './supabase';

export interface PinPhoto {
  id: string;
  pin_id: string;
  file_path: string;
  file_name: string;
  caption: string;
  sort_order: number;
  created_at: string;
  url?: string;
  blob?: Blob;
}

export async function getPinPhotos(pinId: string): Promise<PinPhoto[]> {
  try {
    const { data, error } = await supabase
      .from('pin_photos')
      .select('*')
      .eq('pin_id', pinId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data) return [];

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

    return photosWithUrls;
  } catch (error) {
    console.error('Error loading pin photos:', error);
    return [];
  }
}

export async function downloadPhotoAsBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to download photo');
    return await response.blob();
  } catch (error) {
    console.error('Error downloading photo:', error);
    return null;
  }
}

export async function getPinPhotosWithBlobs(pinId: string): Promise<PinPhoto[]> {
  const photos = await getPinPhotos(pinId);

  const photosWithBlobs = await Promise.all(
    photos.map(async (photo) => {
      if (photo.url) {
        const blob = await downloadPhotoAsBlob(photo.url);
        return { ...photo, blob: blob || undefined };
      }
      return photo;
    })
  );

  return photosWithBlobs.filter(p => p.blob);
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function getPhotoDataURL(photo: PinPhoto): Promise<string | null> {
  try {
    if (photo.blob) {
      return await blobToDataURL(photo.blob);
    }
    if (photo.url) {
      const blob = await downloadPhotoAsBlob(photo.url);
      if (blob) {
        return await blobToDataURL(blob);
      }
    }
    return null;
  } catch (error) {
    console.error('Error converting photo to data URL:', error);
    return null;
  }
}
