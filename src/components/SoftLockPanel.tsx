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
    <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px] p-4 sm:p-8">
      <div className="max-w-2xl w-full">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-lg p-4 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
            </div>

            <div className="flex-1 w-full">
              <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">
                {title}
              </h3>

              <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6">
                This section requires upstream configuration to be completed first.
              </p>

              <div className="space-y-3">
                <p className="text-xs sm:text-sm font-medium text-slate-700 mb-2">
                  To activate this module:
                </p>

                {reasons.map((reason, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 bg-white rounded-md p-3 border border-slate-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-xs sm:text-sm text-slate-700 break-words">{reason.message}</span>
                    </div>

                    {onActionClick && (
                      <button
                        onClick={() => onActionClick(reason.action)}
                        className="flex items-center gap-1 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors ml-9 sm:ml-0 min-h-[44px] sm:min-h-0 justify-start sm:justify-center"
                      >
                        {reason.action}
                        <ArrowRight className="w-4 h-4 flex-shrink-0" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-100 rounded-md">
                <p className="text-xs sm:text-sm text-blue-800">
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
