/**
 * Utility functions for generating auto IDs and test readings based on member quantities
 */

import { supabase } from './supabase';

export interface QuantityReadingConfig {
  memberId: string;
  memberMark: string;
  projectId: string;
  quantity: number;
  requiredDftMicrons: number;
  baseIdPrefix?: string;
}

export interface GeneratedReading {
  sequenceNumber: number;
  generatedId: string;
  dftReading1: number;
  dftReading2: number;
  dftReading3: number;
  dftAverage: number;
  status: 'pass' | 'fail';
  temperatureC: number;
  humidityPercent: number;
}

/**
 * Generate auto ID for a specific sequence number
 * Format: [MemberMark]-[SequenceNumber]
 * Example: 100EA8-001, 100EA8-002, 100EA8-003
 */
export function generateAutoId(memberMark: string, sequenceNumber: number, basePrefix?: string): string {
  if (basePrefix) {
    return `${basePrefix}-${String(sequenceNumber).padStart(3, '0')}`;
  }
  return `${memberMark}-${String(sequenceNumber).padStart(3, '0')}`;
}

/**
 * Generate realistic DFT reading with natural variation
 */
function generateDftReading(requiredDft: number, variancePercent: number = 10): number {
  const variance = requiredDft * (variancePercent / 100);
  const minValue = requiredDft - variance;
  const maxValue = requiredDft + variance;
  return Math.round(minValue + Math.random() * (maxValue - minValue));
}

/**
 * Generate 3 DFT readings and calculate average
 */
function generate3DftReadings(requiredDft: number): {
  reading1: number;
  reading2: number;
  reading3: number;
  average: number;
  status: 'pass' | 'fail';
} {
  const reading1 = generateDftReading(requiredDft);
  const reading2 = generateDftReading(requiredDft);
  const reading3 = generateDftReading(requiredDft);
  const average = Math.round((reading1 + reading2 + reading3) / 3);

  // Pass if average is within 90% of required (industry standard tolerance)
  const status = average >= requiredDft * 0.9 ? 'pass' : 'fail';

  return { reading1, reading2, reading3, average, status };
}

/**
 * Generate environmental conditions (temperature and humidity)
 */
function generateEnvironmentalConditions(): { temperatureC: number; humidityPercent: number } {
  // Typical indoor construction conditions
  const temperatureC = Math.round((15 + Math.random() * 15) * 10) / 10; // 15-30°C
  const humidityPercent = Math.round(40 + Math.random() * 30); // 40-70%

  return { temperatureC, humidityPercent };
}

/**
 * Generate all test readings for a member based on quantity
 */
export async function generateQuantityBasedReadings(
  config: QuantityReadingConfig
): Promise<GeneratedReading[]> {
  const readings: GeneratedReading[] = [];

  for (let i = 1; i <= config.quantity; i++) {
    const generatedId = generateAutoId(config.memberMark, i, config.baseIdPrefix);
    const dftData = generate3DftReadings(config.requiredDftMicrons);
    const envData = generateEnvironmentalConditions();

    readings.push({
      sequenceNumber: i,
      generatedId,
      dftReading1: dftData.reading1,
      dftReading2: dftData.reading2,
      dftReading3: dftData.reading3,
      dftAverage: dftData.average,
      status: dftData.status,
      temperatureC: envData.temperatureC,
      humidityPercent: envData.humidityPercent,
    });
  }

  return readings;
}

/**
 * Save generated readings to database
 */
export async function saveGeneratedReadings(
  config: QuantityReadingConfig,
  readings: GeneratedReading[]
): Promise<void> {
  const readingsToInsert = readings.map((reading) => ({
    member_id: config.memberId,
    project_id: config.projectId,
    sequence_number: reading.sequenceNumber,
    generated_id: reading.generatedId,
    dft_reading_1: reading.dftReading1,
    dft_reading_2: reading.dftReading2,
    dft_reading_3: reading.dftReading3,
    dft_average: reading.dftAverage,
    status: reading.status,
    temperature_c: reading.temperatureC,
    humidity_percent: reading.humidityPercent,
    reading_type: 'full_measurement',
    notes: `Auto-generated reading ${reading.sequenceNumber} of ${config.quantity}`,
  }));

  // Delete existing readings for this member first
  await supabase
    .from('inspection_readings')
    .delete()
    .eq('member_id', config.memberId);

  // Insert new readings
  const { error } = await supabase
    .from('inspection_readings')
    .insert(readingsToInsert);

  if (error) throw error;

  // Update member with auto_generated_base_id
  const baseId = generateAutoId(config.memberMark, 1, config.baseIdPrefix);
  await supabase
    .from('members')
    .update({
      auto_generated_base_id: baseId,
    })
    .eq('id', config.memberId);
}

/**
 * Generate and save readings for multiple members
 */
export async function generateBulkQuantityReadings(
  configs: QuantityReadingConfig[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const config of configs) {
    try {
      const readings = await generateQuantityBasedReadings(config);
      await saveGeneratedReadings(config, readings);
      success++;
    } catch (error: any) {
      failed++;
      errors.push(`${config.memberMark}: ${error.message}`);
    }
  }

  return { success, failed, errors };
}

/**
 * Get all readings for a member
 */
export async function getMemberReadings(memberId: string): Promise<GeneratedReading[]> {
  const { data, error } = await supabase
    .from('inspection_readings')
    .select('*')
    .eq('member_id', memberId)
    .order('sequence_number');

  if (error) throw error;

  return (data || []).map((row) => ({
    sequenceNumber: row.sequence_number,
    generatedId: row.generated_id,
    dftReading1: row.dft_reading_1,
    dftReading2: row.dft_reading_2,
    dftReading3: row.dft_reading_3,
    dftAverage: row.dft_average,
    status: row.status,
    temperatureC: row.temperature_c,
    humidityPercent: row.humidity_percent,
  }));
}
