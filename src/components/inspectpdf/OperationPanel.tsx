import { Merge, Split, RotateCw, FileText, Shuffle, Plus } from 'lucide-react';

export type OperationType = 'merge' | 'split' | 'rotate' | 'extract' | 'mix' | 'insert';

interface OperationPanelProps {
  onOperationSelect: (operation: OperationType) => void;
  disabled?: boolean;
}

interface Operation {
  type: OperationType;
  icon: typeof Merge;
  label: string;
  description: string;
  color: string;
}

const operations: Operation[] = [
  {
    type: 'merge',
    icon: Merge,
    label: 'Merge PDFs',
    description: 'Combine multiple PDFs into one',
    color: 'blue',
  },
  {
    type: 'split',
    icon: Split,
    label: 'Split PDF',
    description: 'Divide PDF into multiple files',
    color: 'green',
  },
  {
    type: 'rotate',
    icon: RotateCw,
    label: 'Rotate Pages',
    description: 'Rotate pages by 90°, 180°, or 270°',
    color: 'purple',
  },
  {
    type: 'extract',
    icon: FileText,
    label: 'Extract Pages',
    description: 'Extract specific pages from PDF',
    color: 'orange',
  },
  {
    type: 'mix',
    icon: Shuffle,
    label: 'Mix PDFs',
    description: 'Interleave pages from multiple PDFs',
    color: 'pink',
  },
  {
    type: 'insert',
    icon: Plus,
    label: 'Insert Pages',
    description: 'Insert pages at intervals',
    color: 'teal',
  },
];

const colorClasses: Record<string, { bg: string; hover: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', icon: 'text-blue-600' },
  green: { bg: 'bg-green-50', hover: 'hover:bg-green-100', icon: 'text-green-600' },
  purple: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', icon: 'text-purple-600' },
  orange: { bg: 'bg-orange-50', hover: 'hover:bg-orange-100', icon: 'text-orange-600' },
  pink: { bg: 'bg-pink-50', hover: 'hover:bg-pink-100', icon: 'text-pink-600' },
  teal: { bg: 'bg-teal-50', hover: 'hover:bg-teal-100', icon: 'text-teal-600' },
};

export function OperationPanel({ onOperationSelect, disabled = false }: OperationPanelProps) {
  return (
    <div className="bg-white border-r border-slate-200 p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">PDF Operations</h3>

      <div className="space-y-2">
        {operations.map((operation) => {
          const Icon = operation.icon;
          const colors = colorClasses[operation.color];

          return (
            <button
              key={operation.type}
              onClick={() => onOperationSelect(operation.type)}
              disabled={disabled}
              className={`w-full text-left p-4 rounded-lg border transition-all ${colors.bg} ${colors.hover} border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${colors.icon}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 mb-1">
                    {operation.label}
                  </div>
                  <div className="text-sm text-slate-600">
                    {operation.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h4 className="font-medium text-slate-900 mb-2 text-sm">Quick Tips</h4>
        <ul className="text-xs text-slate-600 space-y-1">
          <li>• All operations can be undone</li>
          <li>• Changes are saved automatically</li>
          <li>• Original PDF is preserved</li>
          <li>• Processing happens locally</li>
        </ul>
      </div>
    </div>
  );
}
