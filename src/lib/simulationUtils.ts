export interface MemberConfig {
  memberName: string;
  requiredThickness: number;
  minValue: number;
  maxValue: number;
  readingsPerMember: number;
}

export interface SimulatedReading {
  readingNo: number;
  dftMicrons: number;
}

export interface MemberSummary {
  memberName: string;
  requiredThickness: number;
  minValue: number;
  maxValue: number;
  readingsCount: number;
  avgDft: number;
  minDft: number;
  maxDft: number;
  stdDev: number;
  percentAboveRequired: number;
  percentBelowRequired: number;
  compliance: 'PASS' | 'FAIL';
}

function boxMullerTransform(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0;
}

function generateNormalRandom(mean: number, stdDev: number): number {
  return mean + boxMullerTransform() * stdDev;
}

export function generateSimulatedReadings(config: MemberConfig, seed?: number): SimulatedReading[] {
  if (seed !== undefined) {
    Math.random = seedableRandom(seed);
  }

  const { minValue, maxValue, readingsPerMember } = config;
  const mean = (minValue + maxValue) / 2;
  const stdDev = (maxValue - minValue) / 6;

  const readings: SimulatedReading[] = [];

  for (let i = 1; i <= readingsPerMember; i++) {
    let value = generateNormalRandom(mean, stdDev);
    value = Math.max(minValue, Math.min(maxValue, value));
    value = Math.round(value);

    readings.push({
      readingNo: i,
      dftMicrons: value,
    });
  }

  return readings;
}

export function calculateSummary(
  memberName: string,
  config: MemberConfig,
  readings: SimulatedReading[]
): MemberSummary {
  const values = readings.map((r) => r.dftMicrons);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const aboveRequired = values.filter((v) => v >= config.requiredThickness).length;
  const belowRequired = values.filter((v) => v < config.requiredThickness).length;

  const percentAbove = (aboveRequired / values.length) * 100;
  const percentBelow = (belowRequired / values.length) * 100;

  const compliance = belowRequired === 0 ? 'PASS' : 'FAIL';

  return {
    memberName,
    requiredThickness: config.requiredThickness,
    minValue: config.minValue,
    maxValue: config.maxValue,
    readingsCount: readings.length,
    avgDft: Math.round(avg * 10) / 10,
    minDft: min,
    maxDft: max,
    stdDev: Math.round(stdDev * 10) / 10,
    percentAboveRequired: Math.round(percentAbove * 10) / 10,
    percentBelowRequired: Math.round(percentBelow * 10) / 10,
    compliance,
  };
}

export function calculateOverallSummary(summaries: MemberSummary[]): {
  totalMembers: number;
  totalReadings: number;
  overallAvg: number;
  overallMin: number;
  overallMax: number;
  membersPassed: number;
  membersFailed: number;
} {
  const totalMembers = summaries.length;
  const totalReadings = summaries.reduce((sum, s) => sum + s.readingsCount, 0);

  const allAvgs = summaries.map((s) => s.avgDft);
  const overallAvg = allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length;

  const overallMin = Math.min(...summaries.map((s) => s.minDft));
  const overallMax = Math.max(...summaries.map((s) => s.maxDft));

  const membersPassed = summaries.filter((s) => s.compliance === 'PASS').length;
  const membersFailed = summaries.filter((s) => s.compliance === 'FAIL').length;

  return {
    totalMembers,
    totalReadings,
    overallAvg: Math.round(overallAvg * 10) / 10,
    overallMin,
    overallMax,
    membersPassed,
    membersFailed,
  };
}

function seedableRandom(seed: number) {
  let state = seed;
  return function () {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}
