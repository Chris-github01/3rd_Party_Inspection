/**
 * Chart generation utilities using Chart.js for PDF export
 */

import { Chart, registerables } from 'chart.js';
import type { HistogramBin } from './readingStatistics';

Chart.register(...registerables);

/**
 * Generate a line chart canvas showing DFT readings by sequence number
 * Returns a base64 data URL suitable for embedding in PDF
 */
export async function generateLineChart(
  values: number[],
  requiredDft?: number
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 400;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const labels = values.map((_, i) => i + 1);

  const datasets: any[] = [
    {
      label: 'DFT Average (μm)',
      data: values,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0.1,
    }
  ];

  if (requiredDft && requiredDft > 0) {
    datasets.push({
      label: 'Required DFT',
      data: Array(values.length).fill(requiredDft),
      borderColor: 'rgb(239, 68, 68)',
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
    });
  }

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: 'DFT Readings by Sequence Number',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: true,
          position: 'top',
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Reading Number',
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          ticks: {
            maxTicksLimit: 20,
          },
        },
        y: {
          title: {
            display: true,
            text: 'Thickness (μm)',
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          beginAtZero: false,
        },
      },
    },
  });

  const dataUrl = canvas.toDataURL('image/png');

  chart.destroy();

  return dataUrl;
}

/**
 * Generate a histogram chart showing distribution of readings
 * Returns a base64 data URL suitable for embedding in PDF
 */
export async function generateHistogram(bins: HistogramBin[]): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 400;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: bins.map(bin => bin.label),
      datasets: [
        {
          label: 'Frequency',
          data: bins.map(bin => bin.count),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: 'Reading Distribution',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Thickness Range (μm)',
            font: {
              size: 14,
              weight: 'bold',
            },
          },
        },
        y: {
          title: {
            display: true,
            text: 'Number of Readings',
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });

  const dataUrl = canvas.toDataURL('image/png');

  chart.destroy();

  return dataUrl;
}
