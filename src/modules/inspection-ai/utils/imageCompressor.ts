const MAX_LONG_SIDE = 1600;
const JPEG_QUALITY = 0.75;

export interface ImageQualityReport {
  usable: boolean;
  blurScore: number;
  reason: string;
}

export async function assessImageQuality(file: File): Promise<ImageQualityReport> {
  if (!file.type.startsWith('image/')) {
    return { usable: false, blurScore: 0, reason: 'not_an_image' };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    if (width < 100 || height < 100) {
      bitmap.close();
      return { usable: false, blurScore: 0, reason: 'image_too_small' };
    }

    const sampleSize = Math.min(200, Math.min(width, height));
    const canvas = new OffscreenCanvas(sampleSize, sampleSize);
    const ctx = canvas.getContext('2d')!;

    const sx = Math.floor((width - sampleSize) / 2);
    const sy = Math.floor((height - sampleSize) / 2);
    ctx.drawImage(bitmap, sx, sy, sampleSize, sampleSize, 0, 0, sampleSize, sampleSize);
    bitmap.close();

    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const blurScore = computeLaplacianVariance(imageData.data, sampleSize, sampleSize);

    const BLUR_THRESHOLD = 80;

    if (blurScore < BLUR_THRESHOLD) {
      return {
        usable: false,
        blurScore: Math.round(blurScore),
        reason: 'too_blurry',
      };
    }

    return { usable: true, blurScore: Math.round(blurScore), reason: 'ok' };
  } catch {
    return { usable: true, blurScore: -1, reason: 'quality_check_failed' };
  }
}

function computeLaplacianVariance(data: Uint8ClampedArray, width: number, height: number): number {
  const values: number[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      const top = 0.299 * data[((y - 1) * width + x) * 4] +
                  0.587 * data[((y - 1) * width + x) * 4 + 1] +
                  0.114 * data[((y - 1) * width + x) * 4 + 2];
      const bottom = 0.299 * data[((y + 1) * width + x) * 4] +
                     0.587 * data[((y + 1) * width + x) * 4 + 1] +
                     0.114 * data[((y + 1) * width + x) * 4 + 2];
      const left = 0.299 * data[(y * width + (x - 1)) * 4] +
                   0.587 * data[(y * width + (x - 1)) * 4 + 1] +
                   0.114 * data[(y * width + (x - 1)) * 4 + 2];
      const right = 0.299 * data[(y * width + (x + 1)) * 4] +
                    0.587 * data[(y * width + (x + 1)) * 4 + 1] +
                    0.114 * data[(y * width + (x + 1)) * 4 + 2];

      const laplacian = Math.abs(top + bottom + left + right - 4 * gray);
      values.push(laplacian);
    }
  }

  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return variance;
}

export async function compressImageFile(file: File): Promise<{
  file: File;
  wasCompressed: boolean;
  originalSizeKB: number;
  compressedSizeKB: number;
  quality: ImageQualityReport;
}> {
  const originalSizeKB = Math.round(file.size / 1024);
  const quality = await assessImageQuality(file);

  if (!file.type.startsWith('image/')) {
    return { file, wasCompressed: false, originalSizeKB, compressedSizeKB: originalSizeKB, quality };
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
      return { file, wasCompressed: false, originalSizeKB, compressedSizeKB: originalSizeKB, quality };
    }

    const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
    return { file: compressed, wasCompressed: true, originalSizeKB, compressedSizeKB, quality };
  } catch {
    return { file, wasCompressed: false, originalSizeKB, compressedSizeKB: originalSizeKB, quality };
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
