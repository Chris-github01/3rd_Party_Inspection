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
  minValue?: number;
  maxValue?: number;
  readingsPerSet?: number; // Number of readings per quantity set (e.g., 100)
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
  setNumber?: number; // Which quantity set this reading belongs to (e.g., Set 1, Set 2)
  readingWithinSet?: number; // Reading number within its set (1-100)
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
function generateDftReading(requiredDft: number, variancePercent: number = 10, minValue?: number, maxValue?: number): number {
  if (minValue !== undefined && maxValue !== undefined) {
    return Math.round(minValue + Math.random() * (maxValue - minValue));
  }

  const variance = requiredDft * (variancePercent / 100);
  const calculatedMin = requiredDft - variance;
  const calculatedMax = requiredDft + variance;
  return Math.round(calculatedMin + Math.random() * (calculatedMax - calculatedMin));
}

/**
 * Generate 3 DFT readings and calculate average
 */
function generate3DftReadings(requiredDft: number, minValue?: number, maxValue?: number): {
  reading1: number;
  reading2: number;
  reading3: number;
  average: number;
  status: 'pass' | 'fail';
} {
  const reading1 = generateDftReading(requiredDft, 10, minValue, maxValue);
  const reading2 = generateDftReading(requiredDft, 10, minValue, maxValue);
  const reading3 = generateDftReading(requiredDft, 10, minValue, maxValue);
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
 * If readingsPerSet is provided, organize readings into sets
 */
export async function generateQuantityBasedReadings(
  config: QuantityReadingConfig
): Promise<GeneratedReading[]> {
  const readings: GeneratedReading[] = [];
  const readingsPerSet = config.readingsPerSet || config.quantity;

  for (let i = 1; i <= config.quantity; i++) {
    const generatedId = generateAutoId(config.memberMark, i, config.baseIdPrefix);
    const dftData = generate3DftReadings(config.requiredDftMicrons, config.minValue, config.maxValue);
    const envData = generateEnvironmentalConditions();

    // Calculate which set this reading belongs to
    let setNumber: number | undefined;
    let readingWithinSet: number | undefined;

    if (config.readingsPerSet && config.readingsPerSet > 0) {
      setNumber = Math.ceil(i / config.readingsPerSet);
      readingWithinSet = ((i - 1) % config.readingsPerSet) + 1;
    }

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
      setNumber,
      readingWithinSet,
    });
  }

  return readings;
}

/**
 * Save generated readings to database
 * Creates member instances based on quantity and assigns readings to each
 */
export async function saveGeneratedReadings(
  config: QuantityReadingConfig,
  readings: GeneratedReading[]
): Promise<void> {
  // Get the original member data to clone
  const { data: originalMember, error: fetchError } = await supabase
    .from('members')
    .select('*')
    .eq('id', config.memberId)
    .single();

  if (fetchError) throw fetchError;
  if (!originalMember) throw new Error('Member not found');

  // Delete existing readings for this member first
  await supabase
    .from('inspection_readings')
    .delete()
    .eq('member_id', config.memberId);

  // Calculate how many member instances we need based on quantity
  const memberQuantity = originalMember.quantity || 1;
  const readingsPerInstance = config.readingsPerSet || config.quantity;

  // If quantity is 1, just update the existing member
  if (memberQuantity === 1) {
    const readingsToInsert = readings.map((reading) => {
      const notes = config.readingsPerSet
        ? `Reading ${reading.sequenceNumber}/${config.readingsPerSet}`
        : `Auto-generated reading ${reading.sequenceNumber} of ${config.quantity}`;

      return {
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
        notes,
      };
    });

    // Insert readings
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
  } else {
    // Quantity > 1: Create multiple member instances
    // First, update the original member to be instance 1
    const baseId1 = `${config.memberMark}-1`;
    await supabase
      .from('members')
      .update({
        member_mark: baseId1,
        quantity: 1, // Each instance represents 1 piece
        auto_generated_base_id: baseId1,
      })
      .eq('id', config.memberId);

    // Get readings for instance 1
    const instance1Readings = readings.slice(0, readingsPerInstance);
    const readingsToInsert1 = instance1Readings.map((reading, index) => ({
      member_id: config.memberId,
      project_id: config.projectId,
      sequence_number: index + 1,
      generated_id: `${baseId1}-${String(index + 1).padStart(3, '0')}`,
      dft_reading_1: reading.dftReading1,
      dft_reading_2: reading.dftReading2,
      dft_reading_3: reading.dftReading3,
      dft_average: reading.dftAverage,
      status: reading.status,
      temperature_c: reading.temperatureC,
      humidity_percent: reading.humidityPercent,
      reading_type: 'full_measurement',
      notes: `Instance 1: Reading ${index + 1}/${readingsPerInstance}`,
    }));

    await supabase
      .from('inspection_readings')
      .insert(readingsToInsert1);

    // Create additional member instances (2 through N)
    for (let instanceNum = 2; instanceNum <= memberQuantity; instanceNum++) {
      const instanceMark = `${config.memberMark}-${instanceNum}`;
      const startIdx = (instanceNum - 1) * readingsPerInstance;
      const endIdx = Math.min(startIdx + readingsPerInstance, readings.length);
      const instanceReadings = readings.slice(startIdx, endIdx);

      // Create new member instance
      const { data: newMember, error: insertError } = await supabase
        .from('members')
        .insert({
          project_id: originalMember.project_id,
          member_mark: instanceMark,
          element_type: originalMember.element_type,
          section: originalMember.section,
          level: originalMember.level,
          block: originalMember.block,
          frr_minutes: originalMember.frr_minutes,
          coating_system: originalMember.coating_system,
          required_dft_microns: originalMember.required_dft_microns,
          required_thickness_mm: originalMember.required_thickness_mm,
          status: 'not_started',
          notes: `Auto-generated instance ${instanceNum} of ${memberQuantity}`,
          quantity: 1, // Each instance represents 1 piece
          auto_generated_base_id: instanceMark,
          is_spot_check: originalMember.is_spot_check || false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create readings for this instance
      const readingsToInsert = instanceReadings.map((reading, index) => ({
        member_id: newMember.id,
        project_id: config.projectId,
        sequence_number: index + 1,
        generated_id: `${instanceMark}-${String(index + 1).padStart(3, '0')}`,
        dft_reading_1: reading.dftReading1,
        dft_reading_2: reading.dftReading2,
        dft_reading_3: reading.dftReading3,
        dft_average: reading.dftAverage,
        status: reading.status,
        temperature_c: reading.temperatureC,
        humidity_percent: reading.humidityPercent,
        reading_type: 'full_measurement',
        notes: `Instance ${instanceNum}: Reading ${index + 1}/${readingsPerInstance}`,
      }));

      await supabase
        .from('inspection_readings')
        .insert(readingsToInsert);
    }
  }
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
