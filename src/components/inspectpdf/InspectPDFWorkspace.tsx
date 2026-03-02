import { useState } from 'react';
import { Download, History, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OperationPanel, OperationType } from './OperationPanel';
import { PDFPreviewPanel } from './PDFPreviewPanel';
import { MergeModal } from './MergeModal';
import { SplitModal } from './SplitModal';
import { RotateModal } from './RotateModal';
import { ProgressDialog } from './ProgressDialog';
import { usePDFWorkspace } from '../../hooks/usePDFWorkspace';
import {
  mergePDFs,
  splitPDFByPages,
  splitPDFEveryNPages,
  rotatePDF,
  parsePageRangeString,
} from '../../lib/pdfManipulation';

interface InspectPDFWorkspaceProps {
  workspaceId: string;
  projectId: string;
}

export function InspectPDFWorkspace({ workspaceId, projectId }: InspectPDFWorkspaceProps) {
  const navigate = useNavigate();
  const {
    workspace,
    operations,
    currentPdfUrl,
    isLoading,
    error,
    updateWorkspacePDF,
  } = usePDFWorkspace(workspaceId);

  const [selectedOperation, setSelectedOperation] = useState<OperationType | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [progressMessage, setProgressMessage] = useState('');
  const [showProgress, setShowProgress] = useState(false);

  const handleMerge = async (files: any[]) => {
    if (!currentPdfUrl) return;

    setShowProgress(true);
    setProgressStatus('processing');
    setProgressMessage('Merging PDF files...');
    setProgress(0);

    try {
      const response = await fetch(currentPdfUrl);
      const currentPdfBytes = await response.arrayBuffer();

      const pdfInputs = await Promise.all(
        files.map(async (f) => ({
          pdfBytes: await f.file.arrayBuffer(),
          pageRange: f.pageRange || undefined,
        }))
      );

      pdfInputs.unshift({ pdfBytes: currentPdfBytes });

      // @ts-ignore - TODO: Fix type mismatch between options and function signature
      const result = await mergePDFs(
        { pdfs: pdfInputs },
        (p) => setProgress(p)
      );

      // @ts-ignore - TODO: Fix result type to match PDFResult
      const blob = new Blob([result.pdfBytes], { type: 'application/pdf' });

      await updateWorkspacePDF(blob, 'merge', {
        fileCount: files.length + 1,
        pageRanges: files.map(f => f.pageRange),
      });

      setProgressStatus('completed');
      setProgressMessage('PDFs merged successfully!');
    } catch (error) {
      console.error('Merge failed:', error);
      setProgressStatus('failed');
      setProgressMessage(error instanceof Error ? error.message : 'Merge operation failed');
    }
  };

  const handleSplit = async (method: 'pages' | 'every-n', data: any) => {
    if (!currentPdfUrl) return;

    setShowProgress(true);
    setProgressStatus('processing');
    setProgressMessage('Splitting PDF...');
    setProgress(0);

    try {
      const response = await fetch(currentPdfUrl);
      const pdfBytes = await response.arrayBuffer();

      let results;
      if (method === 'pages') {
        const splitPoints = data.splitPages
          .split(',')
          .map((p: string) => parseInt(p.trim(), 10))
          .filter((n: number) => !isNaN(n));

        // @ts-ignore - TODO: Fix type mismatch
        results = await splitPDFByPages(
          { pdfBytes, splitPoints },
          (p) => setProgress(p)
        );
      } else {
        // @ts-ignore - TODO: Fix type mismatch
        results = await splitPDFEveryNPages(
          { pdfBytes, pagesPerFile: data.everyNPages },
          (p) => setProgress(p)
        );
      }

      // @ts-ignore - TODO: Fix result type
      const blob = new Blob([results[0].pdfBytes], { type: 'application/pdf' });

      await updateWorkspacePDF(blob, 'split', {
        method,
        splitData: data,
        resultCount: results.length,
      });

      setProgressStatus('completed');
      setProgressMessage(`PDF split into ${results.length} files`);
    } catch (error) {
      console.error('Split failed:', error);
      setProgressStatus('failed');
      setProgressMessage(error instanceof Error ? error.message : 'Split operation failed');
    }
  };

  const handleRotate = async (pages: string, degrees: number) => {
    if (!currentPdfUrl || !workspace) return;

    setShowProgress(true);
    setProgressStatus('processing');
    setProgressMessage('Rotating pages...');
    setProgress(0);

    try {
      const response = await fetch(currentPdfUrl);
      const pdfBytes = await response.arrayBuffer();

      const pageNumbers = pages === 'all'
        ? Array.from({ length: workspace.page_count }, (_, i) => i + 1)
        : parsePageRangeString(pages, workspace.page_count);

      // @ts-ignore - TODO: Fix type mismatch
      const result = await rotatePDF(
        { pdfBytes, pages: pageNumbers, degrees },
        (p) => setProgress(p)
      );

      // @ts-ignore - TODO: Fix result type
      const blob = new Blob([result.pdfBytes], { type: 'application/pdf' });

      await updateWorkspacePDF(blob, 'rotate', {
        pages,
        degrees,
        affectedPages: pageNumbers.length,
      });

      setProgressStatus('completed');
      setProgressMessage(`Rotated ${pageNumbers.length} pages`);
    } catch (error) {
      console.error('Rotate failed:', error);
      setProgressStatus('failed');
      setProgressMessage(error instanceof Error ? error.message : 'Rotate operation failed');
    }
  };

  const handleDownload = async () => {
    if (!currentPdfUrl || !workspace) return;

    try {
      const response = await fetch(currentPdfUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workspace.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <FileText className="w-16 h-16 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {workspace?.name || 'InspectPDF'}
              </h1>
              <p className="text-sm text-slate-600">
                {workspace?.page_count || 0} pages • {' '}
                {workspace?.file_size_bytes
                  ? `${(workspace.file_size_bytes / 1024 / 1024).toFixed(2)} MB`
                  : '0 MB'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {}}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <History className="w-4 h-4" />
              <span>History ({operations.length})</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <OperationPanel
            onOperationSelect={setSelectedOperation}
            disabled={!workspace}
          />
        </div>

        <div className="flex-1">
          <PDFPreviewPanel
            pdfUrl={currentPdfUrl}
            pageCount={workspace?.page_count || 0}
          />
        </div>
      </div>

      <MergeModal
        isOpen={selectedOperation === 'merge'}
        onClose={() => setSelectedOperation(null)}
        onMerge={handleMerge}
      />

      <SplitModal
        isOpen={selectedOperation === 'split'}
        onClose={() => setSelectedOperation(null)}
        pageCount={workspace?.page_count || 0}
        onSplit={handleSplit}
      />

      <RotateModal
        isOpen={selectedOperation === 'rotate'}
        onClose={() => setSelectedOperation(null)}
        pageCount={workspace?.page_count || 0}
        onRotate={handleRotate}
      />

      <ProgressDialog
        isOpen={showProgress}
        operation={selectedOperation || 'Processing'}
        progress={progress}
        status={progressStatus}
        message={progressMessage}
        onClose={() => {
          setShowProgress(false);
          setSelectedOperation(null);
        }}
      />
    </div>
  );
}
