import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ReadingsLineChartProps {
  values: number[];
  requiredDft?: number;
  width?: number;
  height?: number;
}

export function ReadingsLineChart({ values, requiredDft, width = 800, height = 400 }: ReadingsLineChartProps) {
  const data = values.map((value, index) => ({
    reading: index + 1,
    dft: value,
  }));

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="reading"
          label={{ value: 'Reading Number', position: 'insideBottom', offset: -10 }}
          stroke="#6b7280"
        />
        <YAxis
          label={{ value: 'DFT (µm)', angle: -90, position: 'insideLeft' }}
          stroke="#6b7280"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #d1d5db',
            borderRadius: '6px'
          }}
          formatter={(value: number) => [`${value.toFixed(1)} µm`, 'DFT']}
          labelFormatter={(label) => `Reading #${label}`}
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
        />
        {requiredDft && (
          <ReferenceLine
            y={requiredDft}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{ value: `Required: ${requiredDft}µm`, position: 'right', fill: '#ef4444' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="dft"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ fill: '#2563eb', r: 4 }}
          activeDot={{ r: 6 }}
          name="DFT Reading"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
