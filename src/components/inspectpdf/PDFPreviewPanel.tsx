import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { generateMultipleThumbnails } from '../../lib/pdfThumbnail';

interface PDFPreviewPanelProps {
  pdfUrl: string | null;
  pageCount: number;
  selectedPages?: Set<number>;
  onPageSelect?: (pageNumber: number) => void;
  thumbnailSize?: 'small' | 'medium' | 'large';
}

export function PDFPreviewPanel({
  pdfUrl,
  pageCount,
  selectedPages = new Set(),
  onPageSelect,
  thumbnailSize = 'medium',
}: PDFPreviewPanelProps) {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const sizeClasses = {
    small: 'w-20 h-28',
    medium: 'w-32 h-44',
    large: 'w-48 h-64',
  };

  useEffect(() => {
    if (!pdfUrl || pageCount === 0) return;

    const loadThumbnails = async () => {
      setIsLoading(true);
      setLoadProgress(0);

      try {
        const response = await fetch(pdfUrl);
        const pdfBytes = new Uint8Array(await response.arrayBuffer());

        const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);

        const generatedThumbnails = await generateMultipleThumbnails(
          pdfBytes,
          pageNumbers,
          {
            scale: thumbnailSize === 'small' ? 0.3 : thumbnailSize === 'medium' ? 0.5 : 0.7,
            quality: 0.8,
          },
          (current, total) => {
            setLoadProgress((current / total) * 100);
          }
        );

        setThumbnails(generatedThumbnails);
      } catch (error) {
        console.error('Failed to generate thumbnails:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThumbnails();
  }, [pdfUrl, pageCount, thumbnailSize]);

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="text-center text-slate-400">
          <FileText className="w-16 h-16 mx-auto mb-4" />
          <p>No PDF loaded</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600">Generating thumbnails...</p>
        <div className="w-64 h-2 bg-slate-200 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
        <p className="text-sm text-slate-500 mt-2">{Math.round(loadProgress)}%</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4">
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => {
          const thumbnail = thumbnails.get(pageNum);
          const isSelected = selectedPages.has(pageNum);

          return (
            <div
              key={pageNum}
              className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                isSelected
                  ? 'border-blue-600 ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => onPageSelect?.(pageNum)}
            >
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={`Page ${pageNum}`}
                  className={`${sizeClasses[thumbnailSize]} object-contain bg-white`}
                />
              ) : (
                <div className={`${sizeClasses[thumbnailSize]} bg-slate-100 flex items-center justify-center`}>
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-slate-900 bg-opacity-75 text-white text-xs py-1 px-2 text-center">
                Page {pageNum}
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
