import { DateTimeRange } from './exports/professionalReport/reportTypes';

export interface DistributedTimestamp {
  readingId: string;
  timestamp: Date;
}

export interface MemberReadings {
  memberId: string;
  memberMark: string;
  readingIds: string[];
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

  const sortedRanges = [...dateTimeRanges].sort((a, b) =>
    new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
  );

  let currentRangeIndex = 0;
  let currentTime = parseDateTime(sortedRanges[0]);

  return readingIds.map(id => {
    const secondsPerReading = 5 + Math.random() * 3;
    currentTime = new Date(currentTime.getTime() + secondsPerReading * 1000);

    const rangeEndTime = parseDateTime(sortedRanges[currentRangeIndex], true);
    if (currentTime > rangeEndTime && currentRangeIndex < sortedRanges.length - 1) {
      currentRangeIndex++;
      currentTime = parseDateTime(sortedRanges[currentRangeIndex]);
    }

    return {
      readingId: id,
      timestamp: new Date(currentTime)
    };
  });
}

export function distributeMemberTimestamps(
  members: MemberReadings[],
  dateTimeRanges: DateTimeRange[]
): DistributedTimestamp[] {
  if (!dateTimeRanges || dateTimeRanges.length === 0) {
    return [];
  }

  const timestamps: DistributedTimestamp[] = [];
  const sortedRanges = [...dateTimeRanges].sort((a, b) =>
    new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
  );

  const totalMembers = members.length;
  let currentRangeIndex = 0;
  let currentTime = parseDateTime(sortedRanges[0]);

  const advanceTime = (seconds: number): boolean => {
    currentTime = new Date(currentTime.getTime() + seconds * 1000);
    let rangeEndTime = parseDateTime(sortedRanges[currentRangeIndex], true);

    while (currentTime > rangeEndTime) {
      currentRangeIndex++;
      if (currentRangeIndex >= sortedRanges.length) {
        currentRangeIndex = sortedRanges.length - 1;
        currentTime = parseDateTime(sortedRanges[currentRangeIndex], true);
        return false;
      }
      currentTime = parseDateTime(sortedRanges[currentRangeIndex]);
      rangeEndTime = parseDateTime(sortedRanges[currentRangeIndex], true);
    }
    return true;
  };

  for (let memberIndex = 0; memberIndex < totalMembers; memberIndex++) {
    const member = members[memberIndex];
    const readingCount = member.readingIds.length;

    for (let readingIndex = 0; readingIndex < readingCount; readingIndex++) {
      const secondsPerReading = 5 + Math.random() * 3;
      advanceTime(secondsPerReading);

      timestamps.push({
        readingId: member.readingIds[readingIndex],
        timestamp: new Date(currentTime)
      });
    }

    if (memberIndex < totalMembers - 1) {
      const breakSeconds = 60 + Math.random() * 60;
      advanceTime(breakSeconds);
    }
  }

  return timestamps;
}

function parseDateTime(range: DateTimeRange, useEndTime: boolean = false): Date {
  const time = useEndTime ? range.endTime : range.startTime;
  return new Date(`${range.date}T${time}:00`);
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
