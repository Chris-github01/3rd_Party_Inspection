import type { HistogramBin } from '../lib/readingStatistics';

interface ReadingsHistogramProps {
  bins: HistogramBin[];
  width?: number;
  height?: number;
}

export function ReadingsHistogram({ bins, width = 800, height = 400 }: ReadingsHistogramProps) {
  const padding = 60;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  const barWidth = bins.length > 0 ? chartWidth / bins.length : chartWidth;

  return (
    <div style={{ width, height, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px' }}>
      <svg width={width} height={height} role="img" aria-label="Histogram of thickness readings">
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

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + chartHeight * (1 - ratio);
          return (
            <g key={ratio}>
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
                fontSize="12"
                textAnchor="end"
                fill="#6b7280"
              >
                {Math.round(maxCount * ratio)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {bins.map((bin, i) => {
          const barHeight = (bin.count / maxCount) * (chartHeight - 20);
          const x = padding + i * barWidth + barWidth * 0.1;
          const y = padding + chartHeight - barHeight;
          const w = barWidth * 0.8;
          const isMaxBar = bin.count === maxCount;

          return (
            <g key={`${bin.start}-${bin.end}-${i}`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={barHeight}
                fill={isMaxBar ? '#2563eb' : '#60a5fa'}
                rx="4"
              />
              <text
                x={x + w / 2}
                y={padding + chartHeight + 20}
                fontSize="11"
                textAnchor="middle"
                fill="#6b7280"
                transform={`rotate(-45 ${x + w / 2} ${padding + chartHeight + 20})`}
              >
                {`${bin.start.toFixed(0)}-${bin.end.toFixed(0)}`}
              </text>
              {bin.count > 0 && (
                <text
                  x={x + w / 2}
                  y={y - 6}
                  fontSize="11"
                  textAnchor="middle"
                  fill="#374151"
                  fontWeight="500"
                >
                  {bin.count}
                </text>
              )}
            </g>
          );
        })}

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
          Frequency
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
          DFT Range (µm)
        </text>
      </svg>
    </div>
  );
}
