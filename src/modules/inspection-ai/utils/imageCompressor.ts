const MAX_LONG_SIDE = 1600;
const JPEG_QUALITY = 0.75;

export async function compressImageFile(file: File): Promise<{ file: File; wasCompressed: boolean; originalSizeKB: number; compressedSizeKB: number }> {
  const originalSizeKB = Math.round(file.size / 1024);

  if (!file.type.startsWith('image/')) {
    return { file, wasCompressed: false, originalSizeKB, compressedSizeKB: originalSizeKB };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    const longSide = Math.max(width, height);
    const scale = longSide > MAX_LONG_SIDE ? MAX_LONG_SIDE / longSide : 1;
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = new OffscreenCanvas(targetW, targetH);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
    const compressedSizeKB = Math.round(blob.size / 1024);

    if (blob.size >= file.size) {
      return { file, wasCompressed: false, originalSizeKB, compressedSizeKB: originalSizeKB };
    }

    const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
    return { file: compressed, wasCompressed: true, originalSizeKB, compressedSizeKB };
  } catch {
    return { file, wasCompressed: false, originalSizeKB, compressedSizeKB: originalSizeKB };
  }
}

export async function hashImageFile(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}
