import { HistogramBin } from './reportTypes';

export async function renderHistogramToImage(
  histogram: HistogramBin[],
  options: {
    width?: number;
    height?: number;
    barColor?: string;
    backgroundColor?: string;
    showGrid?: boolean;
  } = {}
): Promise<string> {
  const {
    width = 800,
    height = 400,
    barColor = '#D4A537',
    backgroundColor = '#FAFAFA',
    showGrid = true
  } = options;

  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const padding = {
        top: 40,
        right: 30,
        bottom: 60,
        left: 60
      };

      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      const maxCount = Math.max(...histogram.map(b => b.count), 1);

      if (showGrid) {
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;

        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
          const y = padding.top + (chartHeight / gridLines) * i;
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(padding.left + chartWidth, y);
          ctx.stroke();

          const value = Math.round(maxCount * (1 - i / gridLines));
          ctx.fillStyle = '#666666';
          ctx.font = '11px Arial';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(value.toString(), padding.left - 10, y);
        }
      }

      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();

      const barWidth = chartWidth / histogram.length;
      const barGap = barWidth * 0.15;

      histogram.forEach((bin, i) => {
        const barHeight = (bin.count / maxCount) * chartHeight;
        const x = padding.left + i * barWidth + barGap;
        const y = padding.top + chartHeight - barHeight;
        const actualBarWidth = barWidth - 2 * barGap;

        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, actualBarWidth, barHeight);

        ctx.strokeStyle = '#B8941F';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, actualBarWidth, barHeight);

        ctx.fillStyle = '#333333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const labelX = padding.left + i * barWidth + barWidth / 2;
        const labelY = padding.top + chartHeight + 8;

        const labelParts = bin.label.split('-');
        if (labelParts.length === 2) {
          ctx.fillText(labelParts[0], labelX, labelY);
          ctx.fillText(labelParts[1], labelX, labelY + 12);
        } else {
          ctx.fillText(bin.label, labelX, labelY);
        }
      });

      ctx.fillStyle = '#333333';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DFT Distribution (µm)', width / 2, 20);

      ctx.font = '11px Arial';
      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Frequency', 0, 0);
      ctx.restore();

      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Thickness Range (µm)', width / 2, height - 15);

      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
}
