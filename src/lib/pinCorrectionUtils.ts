import { supabase } from './supabase';

interface PinCorrectionData {
  project_id: string;
  drawing_id: string;
  pin_id: string;
  correction_type: 'position' | 'missing' | 'duplicate' | 'incorrect_label' | 'status_change' | 'other';
  original_x?: number;
  original_y?: number;
  corrected_x?: number;
  corrected_y?: number;
  original_label?: string;
  corrected_label?: string;
  original_status?: string;
  corrected_status?: string;
  issue_description: string;
  correction_notes?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  batch_id?: string;
}

export async function recordPinCorrection(data: PinCorrectionData): Promise<{ success: boolean; error?: any }> {
  try {
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from('pin_corrections').insert({
      ...data,
      corrected_by: userData.user?.id,
      corrected_at: new Date().toISOString(),
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error recording pin correction:', error);
    return { success: false, error };
  }
}

export async function detectAndRecordCorrection(
  projectId: string,
  drawingId: string,
  pinId: string,
  oldData: any,
  newData: any,
  batchId?: string
): Promise<void> {
  const corrections: PinCorrectionData[] = [];

  if (oldData.x !== newData.x || oldData.y !== newData.y) {
    corrections.push({
      project_id: projectId,
      drawing_id: drawingId,
      pin_id: pinId,
      correction_type: 'position',
      original_x: oldData.x,
      original_y: oldData.y,
      corrected_x: newData.x,
      corrected_y: newData.y,
      issue_description: 'Pin position corrected',
      severity: 'medium',
      batch_id: batchId,
    });
  }

  if (oldData.label !== newData.label || oldData.pin_number !== newData.pin_number) {
    corrections.push({
      project_id: projectId,
      drawing_id: drawingId,
      pin_id: pinId,
      correction_type: 'incorrect_label',
      original_label: oldData.label || oldData.pin_number,
      corrected_label: newData.label || newData.pin_number,
      issue_description: 'Pin label corrected',
      severity: 'low',
      batch_id: batchId,
    });
  }

  if (oldData.status !== newData.status) {
    corrections.push({
      project_id: projectId,
      drawing_id: drawingId,
      pin_id: pinId,
      correction_type: 'status_change',
      original_status: oldData.status,
      corrected_status: newData.status,
      issue_description: 'Pin status updated',
      severity: 'low',
      batch_id: batchId,
    });
  }

  for (const correction of corrections) {
    await recordPinCorrection(correction);
  }
}

export async function recordMissingPin(
  projectId: string,
  drawingId: string,
  pinId: string,
  pinData: any,
  issueDescription: string,
  severity: 'critical' | 'high' | 'medium' | 'low' = 'high',
  batchId?: string
): Promise<{ success: boolean; error?: any }> {
  return await recordPinCorrection({
    project_id: projectId,
    drawing_id: drawingId,
    pin_id: pinId,
    correction_type: 'missing',
    corrected_x: pinData.x,
    corrected_y: pinData.y,
    corrected_label: pinData.label || pinData.pin_number,
    corrected_status: pinData.status,
    issue_description: issueDescription,
    severity: severity,
    batch_id: batchId,
  });
}

export async function recordDuplicatePin(
  projectId: string,
  drawingId: string,
  pinId: string,
  pinData: any,
  issueDescription: string,
  batchId?: string
): Promise<{ success: boolean; error?: any }> {
  return await recordPinCorrection({
    project_id: projectId,
    drawing_id: drawingId,
    pin_id: pinId,
    correction_type: 'duplicate',
    original_x: pinData.x,
    original_y: pinData.y,
    original_label: pinData.label || pinData.pin_number,
    issue_description: issueDescription,
    severity: 'medium',
    batch_id: batchId,
  });
}

export async function getCorrectionStats(projectId: string): Promise<{
  total: number;
  by_type: { [key: string]: number };
  by_severity: { [key: string]: number };
}> {
  try {
    const { data, error } = await supabase
      .from('pin_corrections')
      .select('correction_type, severity')
      .eq('project_id', projectId);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      by_type: {} as { [key: string]: number },
      by_severity: {} as { [key: string]: number },
    };

    data?.forEach((correction) => {
      stats.by_type[correction.correction_type] =
        (stats.by_type[correction.correction_type] || 0) + 1;
      stats.by_severity[correction.severity] = (stats.by_severity[correction.severity] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error getting correction stats:', error);
    return { total: 0, by_type: {}, by_severity: {} };
  }
}
