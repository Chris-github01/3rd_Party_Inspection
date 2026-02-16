import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onClose: (id: string) => void;
  duration?: number;
}

export function Toast({ id, type, message, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-500/90 border-green-400',
    error: 'bg-red-500/90 border-red-400',
    warning: 'bg-yellow-500/90 border-yellow-400',
    info: 'bg-blue-500/90 border-blue-400',
  };

  const Icon = icons[type];

  return (
    <div
      className={`${colors[type]} backdrop-blur-sm border rounded-lg shadow-lg p-4 flex items-start gap-3 min-w-[300px] max-w-md animate-slide-in`}
    >
      <Icon className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
      <p className="text-white text-sm flex-1 leading-relaxed">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="text-white/80 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
