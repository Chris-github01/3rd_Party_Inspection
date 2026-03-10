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
    console.log(`[Photo Debug] Fetching photos for pin: ${pinId}`);

    const { data, error } = await supabase
      .from('pin_photos')
      .select('*')
      .eq('pin_id', pinId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Photo Debug] Database query error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`[Photo Debug] No photos found for pin: ${pinId}`);
      return [];
    }

    console.log(`[Photo Debug] Found ${data.length} photo(s) in database for pin ${pinId}`);

    const photosWithUrls = await Promise.all(
      data.map(async (photo, index) => {
        console.log(`[Photo Debug] Creating signed URL for photo ${index + 1}/${data.length}: ${photo.file_name}`);
        console.log(`[Photo Debug] File path: ${photo.file_path}`);

        const { data: urlData, error: urlError } = await supabase.storage
          .from('pin-photos')
          .createSignedUrl(photo.file_path, 7200); // Extended to 2 hours

        if (urlError) {
          console.error(`[Photo Debug] Error creating signed URL for ${photo.file_name}:`, urlError);
        } else if (urlData?.signedUrl) {
          console.log(`[Photo Debug] Signed URL created: ${urlData.signedUrl.substring(0, 100)}...`);
        } else {
          console.warn(`[Photo Debug] No signed URL returned for ${photo.file_name}`);
        }

        return {
          ...photo,
          url: urlData?.signedUrl || '',
        };
      })
    );

    const validUrls = photosWithUrls.filter(p => p.url).length;
    console.log(`[Photo Debug] ${validUrls} of ${data.length} photos have valid URLs`);

    return photosWithUrls;
  } catch (error) {
    console.error('[Photo Debug] Error loading pin photos:', error);
    return [];
  }
}

export async function downloadPhotoAsBlob(url: string, maxRetries: number = 3): Promise<Blob | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Photo Download] Attempt ${attempt}/${maxRetries} for URL: ${url.substring(0, 100)}...`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log(`[Photo Download] Success on attempt ${attempt}: ${blob.size} bytes, type: ${blob.type}`);
      return blob;

    } catch (error) {
      console.error(`[Photo Download] Attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt === maxRetries) {
        console.error(`[Photo Download] All ${maxRetries} attempts failed for URL`);
        return null;
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return null;
}

export async function getPinPhotosWithBlobs(pinId: string): Promise<PinPhoto[]> {
  console.log(`[Photo Blobs] Fetching photos with blobs for pin: ${pinId}`);

  const photos = await getPinPhotos(pinId);
  console.log(`[Photo Blobs] Retrieved ${photos.length} photo record(s)`);

  const photosWithBlobs = await Promise.all(
    photos.map(async (photo, index) => {
      console.log(`[Photo Blobs] Processing photo ${index + 1}/${photos.length}: ${photo.file_name}`);

      if (photo.url) {
        console.log(`[Photo Blobs] Downloading blob for: ${photo.file_name}`);
        const blob = await downloadPhotoAsBlob(photo.url);

        if (blob) {
          console.log(`[Photo Blobs] Successfully downloaded blob for ${photo.file_name}: ${blob.size} bytes`);
        } else {
          console.error(`[Photo Blobs] Failed to download blob for ${photo.file_name}`);
        }

        return { ...photo, blob: blob || undefined };
      }

      console.warn(`[Photo Blobs] No URL available for photo: ${photo.file_name}`);
      return photo;
    })
  );

  const validPhotos = photosWithBlobs.filter(p => p.blob);
  console.log(`[Photo Blobs] ${validPhotos.length} of ${photos.length} photos successfully loaded with blobs`);

  if (validPhotos.length === 0 && photos.length > 0) {
    console.error(`[Photo Blobs] WARNING: No photos successfully loaded despite ${photos.length} records in database!`);
  }

  return validPhotos;
}

/**
 * Convert blob to data URL via FileReader
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert blob to clean JPEG data URL via Canvas
 * This ensures the image is in a format that jsPDF can safely embed
 */
export function blobToCleanDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      try {
        // Create canvas with image dimensions
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);

        // Convert to JPEG data URL (more compatible with jsPDF than PNG)
        // Quality 0.92 provides good balance between size and quality
        const dataURL = canvas.toDataURL('image/jpeg', 0.92);

        URL.revokeObjectURL(url);
        resolve(dataURL);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

export async function getPhotoDataURL(photo: PinPhoto): Promise<string | null> {
  try {
    console.log(`[Photo Data URL] Converting photo to data URL: ${photo.file_name}`);

    let blob: Blob | null = null;

    if (photo.blob) {
      console.log(`[Photo Data URL] Using existing blob (${photo.blob.size} bytes)`);
      blob = photo.blob;
    } else if (photo.url) {
      console.log(`[Photo Data URL] No blob available, downloading from URL`);
      blob = await downloadPhotoAsBlob(photo.url);
    } else {
      console.error(`[Photo Data URL] No URL or blob available for ${photo.file_name}`);
      return null;
    }

    if (!blob) {
      console.error(`[Photo Data URL] Failed to get blob for ${photo.file_name}`);
      return null;
    }

    // Use canvas-based conversion for cleaner, jsPDF-compatible output
    console.log(`[Photo Data URL] Converting blob to clean JPEG format via canvas...`);
    const dataURL = await blobToCleanDataURL(blob);
    console.log(`[Photo Data URL] ✓ Clean JPEG data URL created, length: ${dataURL.length} characters`);

    return dataURL;
  } catch (error) {
    console.error(`[Photo Data URL] Error converting photo ${photo.file_name} to data URL:`, error);

    // Fallback to direct FileReader conversion
    try {
      console.log(`[Photo Data URL] Attempting fallback conversion for ${photo.file_name}...`);
      const blob = photo.blob || (photo.url ? await downloadPhotoAsBlob(photo.url) : null);
      if (blob) {
        const dataURL = await blobToDataURL(blob);
        console.log(`[Photo Data URL] ⚠ Fallback conversion succeeded, length: ${dataURL.length}`);
        return dataURL;
      }
    } catch (fallbackError) {
      console.error(`[Photo Data URL] Fallback also failed for ${photo.file_name}:`, fallbackError);
    }

    return null;
  }
}
