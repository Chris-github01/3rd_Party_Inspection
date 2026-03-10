interface ReadingsLineChartProps {
  values: number[];
  requiredDft?: number;
  width?: number;
  height?: number;
}

export function ReadingsLineChart({ values, requiredDft, width = 800, height = 400 }: ReadingsLineChartProps) {
  const padding = 60;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  if (values.length === 0) {
    return (
      <div style={{ width, height, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>No data available</p>
      </div>
    );
  }

  const minValue = Math.min(...values, requiredDft ?? Infinity, 0);
  const maxValue = Math.max(...values, requiredDft ?? 0);
  const range = maxValue - minValue || 1;

  const xScale = (index: number) => padding + (index / Math.max(values.length - 1, 1)) * chartWidth;
  const yScale = (value: number) => padding + chartHeight - ((value - minValue) / range) * chartHeight;

  const pathData = values
    .map((value, index) => `${index === 0 ? 'M' : 'L'} ${xScale(index)} ${yScale(value)}`)
    .join(' ');

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minValue + (range * i) / yTicks);

  const xTicks = Math.min(values.length, 10);
  const xTickIndices = Array.from({ length: xTicks }, (_, i) => Math.floor((values.length - 1) * i / (xTicks - 1)));

  return (
    <div style={{ width, height, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px' }}>
      <svg width={width} height={height} role="img" aria-label="Line chart of thickness readings">
        {/* Grid lines and Y-axis ticks */}
        {yTickValues.map((tickValue, i) => {
          const y = yScale(tickValue);
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={padding + chartWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="3 3"
              />
              <text
                x={padding - 10}
                y={y + 4}
                fontSize="11"
                textAnchor="end"
                fill="#6b7280"
              >
                {tickValue.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Y-axis */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={padding + chartHeight}
          stroke="#6b7280"
          strokeWidth="2"
        />

        {/* X-axis */}
        <line
          x1={padding}
          y1={padding + chartHeight}
          x2={padding + chartWidth}
          y2={padding + chartHeight}
          stroke="#6b7280"
          strokeWidth="2"
        />

        {/* X-axis ticks */}
        {xTickIndices.map((index) => {
          const x = xScale(index);
          return (
            <g key={index}>
              <line
                x1={x}
                y1={padding + chartHeight}
                x2={x}
                y2={padding + chartHeight + 5}
                stroke="#6b7280"
                strokeWidth="1"
              />
              <text
                x={x}
                y={padding + chartHeight + 18}
                fontSize="11"
                textAnchor="middle"
                fill="#6b7280"
              >
                {index + 1}
              </text>
            </g>
          );
        })}

        {/* Required DFT reference line */}
        {requiredDft !== undefined && requiredDft !== null && Number.isFinite(requiredDft) && (
          <g>
            <line
              x1={padding}
              y1={yScale(requiredDft)}
              x2={padding + chartWidth}
              y2={yScale(requiredDft)}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <text
              x={padding + chartWidth - 10}
              y={yScale(requiredDft) - 6}
              fontSize="11"
              textAnchor="end"
              fill="#ef4444"
              fontWeight="500"
            >
              Required: {requiredDft}µm
            </text>
          </g>
        )}

        {/* Line path */}
        <path
          d={pathData}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {values.map((value, index) => (
          <circle
            key={index}
            cx={xScale(index)}
            cy={yScale(value)}
            r="4"
            fill="#2563eb"
            stroke="#fff"
            strokeWidth="2"
          />
        ))}

        {/* Y-axis label */}
        <text
          x={padding - 45}
          y={padding + chartHeight / 2}
          fontSize="13"
          textAnchor="middle"
          fill="#374151"
          fontWeight="500"
          transform={`rotate(-90 ${padding - 45} ${padding + chartHeight / 2})`}
        >
          DFT (µm)
        </text>

        {/* X-axis label */}
        <text
          x={padding + chartWidth / 2}
          y={height - 10}
          fontSize="13"
          textAnchor="middle"
          fill="#374151"
          fontWeight="500"
        >
          Reading Number
        </text>

        {/* Legend */}
        <g transform={`translate(${padding + chartWidth - 150}, ${padding - 30})`}>
          <line x1="0" y1="0" x2="30" y2="0" stroke="#2563eb" strokeWidth="2" />
          <circle cx="15" cy="0" r="4" fill="#2563eb" stroke="#fff" strokeWidth="2" />
          <text x="40" y="4" fontSize="12" fill="#374151">DFT Reading</text>
        </g>
      </svg>
    </div>
  );
}
