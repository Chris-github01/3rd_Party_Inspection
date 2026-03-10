import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { HistogramBin } from '../lib/readingStatistics';

interface ReadingsHistogramProps {
  bins: HistogramBin[];
  width?: number;
  height?: number;
}

export function ReadingsHistogram({ bins, width = 800, height = 400 }: ReadingsHistogramProps) {
  const data = bins.map((bin) => ({
    range: `${bin.start.toFixed(0)}-${bin.end.toFixed(0)}`,
    count: bin.count,
    start: bin.start,
  }));

  const maxCount = Math.max(...bins.map(b => b.count));

  return (
    <ResponsiveContainer width={width} height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="range"
          label={{ value: 'DFT Range (µm)', position: 'insideBottom', offset: -10 }}
          stroke="#6b7280"
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
          stroke="#6b7280"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #d1d5db',
            borderRadius: '6px'
          }}
          formatter={(value: number) => [`${value} readings`, 'Count']}
          labelFormatter={(label) => `Range: ${label} µm`}
        />
        <Bar dataKey="count" name="Reading Count" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.count === maxCount ? '#2563eb' : '#60a5fa'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
