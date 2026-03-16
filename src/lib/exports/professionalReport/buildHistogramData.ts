import { HistogramBin } from './reportTypes';

export function buildHistogramData(values: number[], binCount: number = 10): HistogramBin[] {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) {
    return [{
      start: min,
      end: max,
      count: values.length,
      label: `${min.toFixed(0)}`
    }];
  }

  const adjustedBinCount = Math.min(binCount, Math.max(5, Math.ceil(values.length / 3)));
  const binWidth = range / adjustedBinCount;

  const bins: HistogramBin[] = [];

  for (let i = 0; i < adjustedBinCount; i++) {
    const start = min + i * binWidth;
    const end = i === adjustedBinCount - 1 ? max : start + binWidth;

    const count = values.filter(v => {
      if (i === adjustedBinCount - 1) {
        return v >= start && v <= end;
      } else {
        return v >= start && v < end;
      }
    }).length;

    bins.push({
      start,
      end,
      count,
      label: `${Math.round(start)}-${Math.round(end)}`
    });
  }

  return bins;
}

export function calculateStatistics(values: number[], requiredDft: number): {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  range: number;
  passCount: number;
  failCount: number;
  passRate: number;
} {
  if (values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      range: 0,
      passCount: 0,
      failCount: 0,
      passRate: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = values.length;
  const min = sorted[0];
  const max = sorted[count - 1];
  const mean = values.reduce((sum, v) => sum + v, 0) / count;

  const median = count % 2 === 0
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)];

  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  const passCount = values.filter(v => v >= requiredDft).length;
  const failCount = count - passCount;
  const passRate = (passCount / count) * 100;

  return {
    count,
    min,
    max,
    mean,
    median,
    stdDev,
    range: max - min,
    passCount,
    failCount,
    passRate
  };
}
