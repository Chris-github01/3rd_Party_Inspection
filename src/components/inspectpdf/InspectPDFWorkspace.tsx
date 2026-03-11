import { useState } from 'react';
import { Download, History, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OperationPanel, OperationType } from './OperationPanel';
import { PDFPreviewPanel } from './PDFPreviewPanel';
import { MergeModal } from './MergeModal';
import { SplitModal } from './SplitModal';
import { RotateModal } from './RotateModal';
import { ProgressDialog } from './ProgressDialog';
import { GeneratedFilesPanel } from './GeneratedFilesPanel';
import { usePDFWorkspace } from '../../hooks/usePDFWorkspace';
import {
  mergePDFs,
  splitPDFByPages,
  splitPDFEveryNPages,
  rotatePDF,
  parsePageRangeString,
} from '../../lib/pdfManipulation';
import { supabase } from '../../lib/supabase';

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
  const [refreshFiles, setRefreshFiles] = useState(0);

  const saveGeneratedFile = async (
    blob: Blob,
    filename: string,
    operationType: string,
    operationId?: string,
    metadata?: Record<string, any>,
    pageCount?: number
  ) => {
    if (!workspace) {
      console.warn('No workspace available for saving file');
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existingFiles } = await supabase
        .from('pdf_generated_files')
        .select('filename')
        .eq('workspace_id', workspace.id)
        .ilike('filename', `${filename.replace('.pdf', '')}%`);

      let finalFilename = filename;
      if (existingFiles && existingFiles.length > 0) {
        const baseFilename = filename.replace('.pdf', '');
        const existingFilenames = existingFiles.map(f => f.filename);

        let revisionNumber = 1;
        let proposedFilename = `${baseFilename}_R${revisionNumber}.pdf`;

        while (existingFilenames.includes(proposedFilename)) {
          revisionNumber++;
          proposedFilename = `${baseFilename}_R${revisionNumber}.pdf`;
        }

        finalFilename = proposedFilename;
        console.log(`Duplicate filename detected. Using revision: ${finalFilename}`);
      }

      const timestamp = Date.now();
      const filePath = `${user.id}/${workspace.project_id}/${timestamp}-${finalFilename}`;

      const { error: uploadError } = await supabase.storage
        .from('pdf-generated-files')
        .upload(filePath, blob);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const enrichedMetadata = {
        ...(metadata || {}),
        created_at: new Date().toISOString(),
        timestamp,
        original_filename: filename,
        revision_applied: finalFilename !== filename,
      };

      const { error: dbError } = await supabase
        .from('pdf_generated_files')
        .insert({
          workspace_id: workspace.id,
          operation_id: operationId,
          filename: finalFilename,
          file_path: filePath,
          file_size_bytes: blob.size,
          page_count: pageCount || metadata?.pageCount || 0,
          operation_type: operationType,
          metadata: enrichedMetadata,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      setRefreshFiles(prev => prev + 1);
      console.log(`File saved successfully: ${finalFilename} (${blob.size} bytes)`);
      return true;
    } catch (error) {
      console.error('Error saving generated file:', error);
      return false;
    }
  };

  const handleMerge = async (files: any[]) => {
    setShowProgress(true);
    setProgressStatus('processing');
    setProgressMessage('Merging PDF files...');
    setProgress(0);

    try {
      const pdfInputs = await Promise.all(
        files.map(async (f) => ({
          pdfBytes: await f.file.arrayBuffer(),
          pageRange: f.pageRange || undefined,
          filename: f.file.name,
        }))
      );

      const sources = pdfInputs.map((input) => ({
        file: input.pdfBytes,
        pageRanges: input.pageRange ? [{ start: 1, end: input.pageRange }] : undefined,
        filename: input.filename
      }));

      const result = await mergePDFs(
        {
          sources,
          outputFilename: 'merged.pdf'
        },
        (p) => setProgress(p.progress)
      );

      const blob = new Blob([result.data!], { type: 'application/pdf' });

      const sourceFileNames = pdfInputs.map(f => f.filename).join(', ');
      const mergedFilename = 'merged.pdf';

      const saved = await saveGeneratedFile(blob, mergedFilename, 'merge', undefined, {
        fileCount: files.length,
        sourceFiles: sourceFileNames,
        pageRanges: files.map(f => f.pageRange).filter(Boolean),
        operation_timestamp: Date.now(),
      }, result.metadata?.pageCount);

      if (!saved) {
        throw new Error('Failed to save merged file to database');
      }

      if (workspace) {
        await updateWorkspacePDF(blob, 'merge', {
          fileCount: files.length,
          pageRanges: files.map(f => f.pageRange),
        });
      }

      setProgressStatus('completed');
      setProgressMessage(`Successfully merged ${files.length} PDF file${files.length > 1 ? 's' : ''}!`);
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

        results = await splitPDFByPages(
          {
            source: { file: pdfBytes, filename: 'current.pdf' },
            splitPoints,
            outputPattern: 'split-{n}.pdf'
          },
          (p) => setProgress(p.progress)
        );
      } else {
        results = await splitPDFEveryNPages(
          {
            source: { file: pdfBytes, filename: 'current.pdf' },
            pagesPerChunk: data.everyNPages,
            outputPattern: 'split-{n}.pdf'
          },
          (p) => setProgress(p.progress)
        );
      }

      for (let i = 0; i < results.length; i++) {
        const blob = new Blob([results[i].data!], { type: 'application/pdf' });
        const filename = `split-part-${i + 1}.pdf`;
        await saveGeneratedFile(blob, filename, 'split', undefined, {
          partNumber: i + 1,
          totalParts: results.length,
          method,
        }, results[i].metadata?.pageCount);
      }

      const blob = new Blob([results[0].data!], { type: 'application/pdf' });

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

  const handleImportAndSplit = async (file: File, method: 'pages' | 'every-n', data: any) => {
    setShowProgress(true);
    setProgressStatus('processing');
    setProgressMessage('Splitting imported PDF...');
    setProgress(0);

    try {
      const pdfBytes = await file.arrayBuffer();

      let results;
      if (method === 'pages') {
        const splitPoints = data.splitPages
          .split(',')
          .map((p: string) => parseInt(p.trim(), 10))
          .filter((n: number) => !isNaN(n));

        results = await splitPDFByPages(
          {
            source: { file: pdfBytes, filename: file.name },
            splitPoints,
            outputPattern: 'split-{n}.pdf'
          },
          (p) => setProgress(p.progress)
        );
      } else {
        results = await splitPDFEveryNPages(
          {
            source: { file: pdfBytes, filename: file.name },
            pagesPerChunk: data.everyNPages,
            outputPattern: 'split-{n}.pdf'
          },
          (p) => setProgress(p.progress)
        );
      }

      for (let i = 0; i < results.length; i++) {
        const blob = new Blob([results[i].data!], { type: 'application/pdf' });
        const filename = `${file.name.replace('.pdf', '')}-part-${i + 1}.pdf`;
        await saveGeneratedFile(blob, filename, 'split-imported', undefined, {
          originalFilename: file.name,
          partNumber: i + 1,
          totalParts: results.length,
          method,
        }, results[i].metadata?.pageCount);
      }

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

      const validDegrees = degrees as 90 | 180 | 270 | -90 | -180 | -270;

      const result = await rotatePDF(
        {
          source: { file: pdfBytes, filename: 'current.pdf' },
          pageRanges: pageNumbers.map(p => ({ start: p, end: p })),
          degrees: validDegrees,
          rotateAllPages: pages === 'all'
        },
        (p) => setProgress(p.progress)
      );

      const blob = new Blob([result.data!], { type: 'application/pdf' });

      const rotatedFilename = `rotated-${degrees}deg-${Date.now()}.pdf`;
      await saveGeneratedFile(blob, rotatedFilename, 'rotate', undefined, {
        pages,
        degrees,
        affectedPages: pageNumbers.length,
      }, result.metadata?.pageCount);

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

        <div className="w-80 flex-shrink-0 bg-white border-l border-slate-200 overflow-y-auto p-4">
          <GeneratedFilesPanel key={refreshFiles} workspaceId={workspaceId} />
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
        onImportAndSplit={handleImportAndSplit}
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
