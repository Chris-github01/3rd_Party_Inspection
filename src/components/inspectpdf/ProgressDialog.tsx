import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface ProgressDialogProps {
  isOpen: boolean;
  operation: string;
  progress: number;
  status: 'processing' | 'completed' | 'failed';
  message?: string;
  onClose?: () => void;
}

export function ProgressDialog({
  isOpen,
  operation,
  progress,
  status,
  message,
  onClose,
}: ProgressDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {operation}
              </h3>
              <p className="text-slate-600 mb-4">
                {message || 'Please wait while we process your request...'}
              </p>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-slate-500 mt-2">{Math.round(progress)}%</p>
            </>
          )}

          {status === 'completed' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Operation Complete
              </h3>
              <p className="text-slate-600 mb-4">
                {message || 'Your PDF has been processed successfully!'}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Done
              </button>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Operation Failed
              </h3>
              <p className="text-slate-600 mb-4">
                {message || 'An error occurred while processing your PDF.'}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
