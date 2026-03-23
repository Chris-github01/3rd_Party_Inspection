import { useState } from 'react';
import { Plus, X } from 'lucide-react';

export interface DateTimeRange {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface DateTimeRangeSelectorProps {
  onRangesChange: (ranges: DateTimeRange[]) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export function DateTimeRangeSelector({ onRangesChange, enabled, onEnabledChange }: DateTimeRangeSelectorProps) {
  const [ranges, setRanges] = useState<DateTimeRange[]>([
    {
      id: '1',
      date: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '16:00'
    }
  ]);

  const handleAddRange = () => {
    const newRange: DateTimeRange = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '16:00'
    };
    const updatedRanges = [...ranges, newRange];
    setRanges(updatedRanges);
    onRangesChange(updatedRanges);
  };

  const handleRemoveRange = (id: string) => {
    if (ranges.length <= 1) return;
    const updatedRanges = ranges.filter(r => r.id !== id);
    setRanges(updatedRanges);
    onRangesChange(updatedRanges);
  };

  const handleRangeChange = (id: string, field: keyof DateTimeRange, value: string) => {
    const updatedRanges = ranges.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    );
    setRanges(updatedRanges);
    onRangesChange(updatedRanges);
  };

  const calculateTotalHours = () => {
    let totalMinutes = 0;
    ranges.forEach(range => {
      const [startHour, startMin] = range.startTime.split(':').map(Number);
      const [endHour, endMin] = range.endTime.split(':').map(Number);
      const startTotalMin = startHour * 60 + startMin;
      const endTotalMin = endHour * 60 + endMin;
      totalMinutes += endTotalMin - startTotalMin;
    });
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-900">
            Customize Inspection Dates & Times
          </span>
        </label>
        {enabled && (
          <span className="text-xs text-slate-600">
            Total: {calculateTotalHours()}
          </span>
        )}
      </div>

      {enabled && (
        <div className="space-y-3">
          <p className="text-xs text-slate-600 mb-3">
            Define date and time ranges for your inspection. Readings will be automatically distributed with 8-15 minute intervals.
          </p>

          {ranges.map((range, index) => (
            <div key={range.id} className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Date {index + 1}
                  </label>
                  <input
                    type="date"
                    value={range.date}
                    onChange={(e) => handleRangeChange(range.id, 'date', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={range.startTime}
                    onChange={(e) => handleRangeChange(range.id, 'startTime', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={range.endTime}
                    onChange={(e) => handleRangeChange(range.id, 'endTime', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {ranges.length > 1 && (
                <button
                  onClick={() => handleRemoveRange(range.id)}
                  className="mt-5 p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Remove date range"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={handleAddRange}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Date
          </button>

          {ranges.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="font-medium text-blue-900 mb-1">Preview:</div>
              <div className="text-blue-800 space-y-0.5">
                {ranges.map((range, index) => (
                  <div key={range.id}>
                    • Day {index + 1}: {new Date(range.date).toLocaleDateString('en-NZ', { day: '2-digit', month: '2-digit', year: 'numeric' })} from {range.startTime} to {range.endTime}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
