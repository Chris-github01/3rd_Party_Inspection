import { CheckCircle, XCircle, Clock, AlertTriangle, Loader2, FileQuestion } from 'lucide-react';
import type { ParsingJobStatus } from '../lib/parsingTypes';

interface ParseStatusBadgeProps {
  status: ParsingJobStatus;
  className?: string;
}

export function ParseStatusBadge({ status, className = '' }: ParseStatusBadgeProps) {
  const statusConfig = {
    queued: {
      icon: Clock,
      label: 'Queued',
      bgClass: 'bg-blue-500/20',
      textClass: 'text-blue-300',
      iconClass: 'text-blue-400',
    },
    running: {
      icon: Loader2,
      label: 'Processing',
      bgClass: 'bg-primary-500/20',
      textClass: 'text-primary-300',
      iconClass: 'text-primary-400 animate-spin',
    },
    needs_ocr: {
      icon: FileQuestion,
      label: 'Needs OCR',
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-300',
      iconClass: 'text-yellow-400',
    },
    retrying: {
      icon: Loader2,
      label: 'Retrying',
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-300',
      iconClass: 'text-yellow-400 animate-spin',
    },
    completed: {
      icon: CheckCircle,
      label: 'Completed',
      bgClass: 'bg-green-500/20',
      textClass: 'text-green-300',
      iconClass: 'text-green-400',
    },
    partial_completed: {
      icon: AlertTriangle,
      label: 'Partial',
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-300',
      iconClass: 'text-yellow-400',
    },
    failed: {
      icon: XCircle,
      label: 'Failed',
      bgClass: 'bg-red-500/20',
      textClass: 'text-red-300',
      iconClass: 'text-red-400',
    },
  };

  const config = statusConfig[status] || statusConfig.queued;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgClass} ${config.textClass} ${className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconClass}`} />
      {config.label}
    </span>
  );
}
