import { AlertCircle, ArrowRight } from 'lucide-react';

interface BlockingReason {
  type: string;
  message: string;
  action: string;
}

interface SoftLockPanelProps {
  title: string;
  reasons: BlockingReason[];
  onActionClick?: (action: string) => void;
}

export function SoftLockPanel({ title, reasons, onActionClick }: SoftLockPanelProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-2xl w-full">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-lg p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {title}
              </h3>

              <p className="text-slate-600 mb-6">
                This section requires upstream configuration to be completed first.
              </p>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  To activate this module:
                </p>

                {reasons.map((reason, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white rounded-md p-3 border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                        {index + 1}
                      </div>
                      <span className="text-sm text-slate-700">{reason.message}</span>
                    </div>

                    {onActionClick && (
                      <button
                        onClick={() => onActionClick(reason.action)}
                        className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        {reason.action}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-md">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Enterprise Workflow:</span> This platform follows a sequential, document-driven process to ensure compliance and data integrity throughout your project lifecycle.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
