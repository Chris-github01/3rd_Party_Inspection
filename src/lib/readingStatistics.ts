/**
 * Statistical analysis utilities for DFT inspection readings
 */

export interface ReadingStats {
  count: number;
  mean: number;
  max: number;
  min: number;
  range: number;
  standardDeviation: number;
  meanMinus3Sigma: number;
  covPercent: number;
}

export interface HistogramBin {
  label: string;
  start: number;
  end: number;
  count: number;
}

export interface ComplianceResult {
  requiredDft: number | null;
  meanPass: boolean | null;
  minPass: boolean | null;
  meanMinus3SigmaPass: boolean | null;
  overallPass: boolean | null;
}

/**
 * Calculate comprehensive statistics from an array of readings
 */
export function calculateReadingStats(values: number[]): ReadingStats {
  const clean = values.filter(v => Number.isFinite(v) && !isNaN(v));
  const count = clean.length;

  if (count === 0) {
    return {
      count: 0,
      mean: 0,
      max: 0,
      min: 0,
      range: 0,
      standardDeviation: 0,
      meanMinus3Sigma: 0,
      covPercent: 0,
    };
  }

  const sum = clean.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const max = Math.max(...clean);
  const min = Math.min(...clean);
  const range = max - min;

  const variance =
    count > 1
      ? clean.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (count - 1)
      : 0;

  const standardDeviation = Math.sqrt(variance);
  const meanMinus3Sigma = mean - 3 * standardDeviation;
  const covPercent = mean !== 0 ? (standardDeviation / mean) * 100 : 0;

  return {
    count,
    mean: Math.round(mean * 10) / 10,
    max,
    min,
    range,
    standardDeviation: Math.round(standardDeviation * 10) / 10,
    meanMinus3Sigma: Math.round(meanMinus3Sigma * 10) / 10,
    covPercent: Math.round(covPercent * 10) / 10,
  };
}

/**
 * Build histogram data by grouping readings into bins
 */
export function buildHistogram(values: number[], binCount: number = 8): HistogramBin[] {
  const clean = values.filter(v => Number.isFinite(v) && !isNaN(v));

  if (clean.length === 0) {
    return [];
  }

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const binSize = span / binCount;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
    const start = min + i * binSize;
    const end = i === binCount - 1 ? max : start + binSize;
    return {
      label: `${Math.round(start)}-${Math.round(end)}`,
      start,
      end,
      count: 0,
    };
  });

  clean.forEach(value => {
    let index = Math.floor((value - min) / binSize);
    if (index >= binCount) index = binCount - 1;
    if (index < 0) index = 0;
    bins[index].count += 1;
  });

  return bins;
}

/**
 * Evaluate compliance against required DFT specification
 */
export function evaluateCompliance(
  requiredDft: number | null | undefined,
  stats: ReadingStats
): ComplianceResult {
  if (!requiredDft || requiredDft === 0) {
    return {
      requiredDft: null,
      meanPass: null,
      minPass: null,
      meanMinus3SigmaPass: null,
      overallPass: null,
    };
  }

  const meanPass = stats.mean >= requiredDft;
  const minPass = stats.min >= requiredDft * 0.9;
  const meanMinus3SigmaPass = stats.meanMinus3Sigma >= requiredDft * 0.9;

  return {
    requiredDft,
    meanPass,
    minPass,
    meanMinus3SigmaPass,
    overallPass: meanPass && meanMinus3SigmaPass,
  };
}

/**
 * Prepare line chart data for plotting readings by sequence
 */
export function buildLineChartData(values: number[]): Array<{ reading: number; thickness: number }> {
  return values.map((value, index) => ({
    reading: index + 1,
    thickness: value,
  }));
}
