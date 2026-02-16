import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    info: 'bg-blue-600 hover:bg-blue-700',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg max-w-md w-full border border-white/10 animate-scale-in">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${variant === 'danger' ? 'bg-red-500/20' : 'bg-yellow-500/20'} flex items-center justify-center`}>
              <AlertTriangle className={`w-6 h-6 ${variant === 'danger' ? 'text-red-400' : 'text-yellow-400'}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-blue-100 text-sm leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="border-t border-white/10 p-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 ${variantStyles[variant]} text-white rounded-lg transition-colors font-semibold shadow-lg`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
