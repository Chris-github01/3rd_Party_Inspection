import { supabase } from './supabase';

export interface NormalizedCoordinates {
  x_normalized: number;
  y_normalized: number;
  canvas_width: number;
  canvas_height: number;
}

export interface PixelCoordinates {
  x: number;
  y: number;
}

export function normalizeCoordinates(
  pixelX: number,
  pixelY: number,
  canvasWidth: number,
  canvasHeight: number
): NormalizedCoordinates {
  return {
    x_normalized: pixelX / canvasWidth,
    y_normalized: pixelY / canvasHeight,
    canvas_width: canvasWidth,
    canvas_height: canvasHeight,
  };
}

export function denormalizeCoordinates(
  xNormalized: number,
  yNormalized: number,
  targetWidth: number,
  targetHeight: number
): PixelCoordinates {
  return {
    x: xNormalized * targetWidth,
    y: yNormalized * targetHeight,
  };
}

export async function savePinWithNormalizedCoordinates(
  pinData: {
    drawing_id: string;
    project_id: string;
    member_id?: string;
    label?: string;
    pin_number?: string;
    pin_type?: string;
    steel_type?: string;
    page_number?: number;
    block_id?: string;
    level_id?: string;
    status?: string;
  },
  pixelX: number,
  pixelY: number,
  canvasWidth: number,
  canvasHeight: number
): Promise<{ success: boolean; pinId?: string; error?: any }> {
  try {
    const normalized = normalizeCoordinates(pixelX, pixelY, canvasWidth, canvasHeight);

    const { data, error } = await supabase
      .from('drawing_pins')
      .insert({
        ...pinData,
        x: pixelX,
        y: pixelY,
        x_normalized: normalized.x_normalized,
        y_normalized: normalized.y_normalized,
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      pinId: data.id,
    };
  } catch (error) {
    console.error('Error saving pin with normalized coordinates:', error);
    return {
      success: false,
      error,
    };
  }
}

export async function updatePinWithNormalizedCoordinates(
  pinId: string,
  pixelX: number,
  pixelY: number,
  canvasWidth: number,
  canvasHeight: number
): Promise<{ success: boolean; error?: any }> {
  try {
    const normalized = normalizeCoordinates(pixelX, pixelY, canvasWidth, canvasHeight);

    const { error } = await supabase
      .from('drawing_pins')
      .update({
        x: pixelX,
        y: pixelY,
        x_normalized: normalized.x_normalized,
        y_normalized: normalized.y_normalized,
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
      })
      .eq('id', pinId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating pin with normalized coordinates:', error);
    return {
      success: false,
      error,
    };
  }
}

export async function getPinsWithCoordinatesForDrawing(
  drawingId: string,
  targetWidth: number,
  targetHeight: number
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('drawing_pins')
      .select(
        `
        *,
        members(member_mark, frr_rating, steel_type)
      `
      )
      .eq('drawing_id', drawingId)
      .order('pin_number');

    if (error) throw error;

    return (data || []).map((pin) => {
      let displayX = pin.x;
      let displayY = pin.y;

      if (pin.x_normalized != null && pin.y_normalized != null) {
        const denormalized = denormalizeCoordinates(
          pin.x_normalized,
          pin.y_normalized,
          targetWidth,
          targetHeight
        );
        displayX = denormalized.x;
        displayY = denormalized.y;
      }

      const memberMark = pin.members?.[0]?.member_mark || pin.label || pin.pin_number;

      return {
        ...pin,
        displayX,
        displayY,
        memberMark,
      };
    });
  } catch (error) {
    console.error('Error getting pins with coordinates:', error);
    return [];
  }
}

export async function migrateExistingPinsToNormalized(): Promise<{
  success: boolean;
  migrated: number;
  error?: any;
}> {
  try {
    const { data: pins, error: fetchError } = await supabase
      .from('drawing_pins')
      .select('id, x, y, canvas_width, canvas_height, x_normalized, y_normalized')
      .is('x_normalized', null);

    if (fetchError) throw fetchError;

    if (!pins || pins.length === 0) {
      return { success: true, migrated: 0 };
    }

    let migrated = 0;

    for (const pin of pins) {
      if (pin.canvas_width && pin.canvas_height && pin.x != null && pin.y != null) {
        const normalized = normalizeCoordinates(
          pin.x,
          pin.y,
          pin.canvas_width,
          pin.canvas_height
        );

        const { error: updateError } = await supabase
          .from('drawing_pins')
          .update({
            x_normalized: normalized.x_normalized,
            y_normalized: normalized.y_normalized,
          })
          .eq('id', pin.id);

        if (!updateError) {
          migrated++;
        }
      }
    }

    return { success: true, migrated };
  } catch (error) {
    console.error('Error migrating pins to normalized coordinates:', error);
    return {
      success: false,
      migrated: 0,
      error,
    };
  }
}
