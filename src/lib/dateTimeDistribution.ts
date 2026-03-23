import { DateTimeRange } from './exports/professionalReport/reportTypes';

export interface DistributedTimestamp {
  readingId: string;
  timestamp: Date;
}

export function distributeTimestampsAcrossRanges(
  readingIds: string[],
  dateTimeRanges: DateTimeRange[]
): DistributedTimestamp[] {
  if (!dateTimeRanges || dateTimeRanges.length === 0) {
    return readingIds.map(id => ({
      readingId: id,
      timestamp: new Date()
    }));
  }

  const totalReadings = readingIds.length;
  const timestamps: DistributedTimestamp[] = [];

  const timeSlots: Date[] = [];
  for (const range of dateTimeRanges) {
    const slots = generateTimeSlotsForRange(range);
    timeSlots.push(...slots);
  }

  timeSlots.sort((a, b) => a.getTime() - b.getTime());

  if (totalReadings <= timeSlots.length) {
    const step = Math.floor(timeSlots.length / totalReadings);
    for (let i = 0; i < totalReadings; i++) {
      const slotIndex = Math.min(i * step, timeSlots.length - 1);
      timestamps.push({
        readingId: readingIds[i],
        timestamp: timeSlots[slotIndex]
      });
    }
  } else {
    for (let i = 0; i < totalReadings; i++) {
      const slotIndex = i % timeSlots.length;
      timestamps.push({
        readingId: readingIds[i],
        timestamp: timeSlots[slotIndex]
      });
    }
  }

  return timestamps;
}

function generateTimeSlotsForRange(range: DateTimeRange): Date[] {
  const slots: Date[] = [];

  const [startHour, startMin] = range.startTime.split(':').map(Number);
  const [endHour, endMin] = range.endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const durationMinutes = endMinutes - startMinutes;

  if (durationMinutes <= 0) {
    return slots;
  }

  const minInterval = 8;
  const maxInterval = 15;
  const avgInterval = (minInterval + maxInterval) / 2;

  const numSlots = Math.floor(durationMinutes / avgInterval);

  for (let i = 0; i < numSlots; i++) {
    const randomInterval = minInterval + Math.random() * (maxInterval - minInterval);
    const offsetMinutes = Math.floor(i * randomInterval);
    const totalMinutes = startMinutes + offsetMinutes;

    if (totalMinutes >= endMinutes) break;

    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    const dateStr = range.date;
    const timestamp = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);

    slots.push(timestamp);
  }

  return slots;
}

export function calculateTotalDuration(dateTimeRanges: DateTimeRange[]): { hours: number; minutes: number } {
  let totalMinutes = 0;

  for (const range of dateTimeRanges) {
    const [startHour, startMin] = range.startTime.split(':').map(Number);
    const [endHour, endMin] = range.endTime.split(':').map(Number);
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    totalMinutes += endTotalMin - startTotalMin;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { hours, minutes };
}
