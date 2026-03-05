import { DayEntry, WeekDays, DAYS } from '../types/hbh';

/** Parse "HH:MM" → total minutes, returns null if invalid */
function toMinutes(time: string): number | null {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(':').map(Number);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export interface DayCalc {
  workedMinutes: number;   // total on-clock minus lunch
  straightMinutes: number; // hours before hitting 40hr weekly cap
  overtimeMinutes: number; // hours after 40hr weekly cap
}

/** Calculate worked minutes for a single day (no overtime logic here) */
export function calcDay(entry: DayEntry): { workedMinutes: number } {
  const inM  = toMinutes(entry.timeIn);
  const outM = toMinutes(entry.timeOut);
  if (inM === null || outM === null || outM <= inM) {
    return { workedMinutes: 0 };
  }

  let worked = outM - inM;

  const lunchOutM = toMinutes(entry.lunchOut);
  const lunchInM  = toMinutes(entry.lunchIn);
  if (lunchOutM !== null && lunchInM !== null && lunchInM > lunchOutM) {
    worked -= (lunchInM - lunchOutM);
  }

  if (worked < 0) worked = 0;

  return { workedMinutes: worked };
}

export interface WeekCalc {
  days: Record<string, DayCalc>;
  totalWorkedMinutes: number;
  totalStraightMinutes: number;
  totalOvertimeMinutes: number;
}

const WEEKLY_OT_THRESHOLD = 40 * 60; // 40 hours in minutes

export function calcWeek(days: WeekDays): WeekCalc {
  const result: Record<string, DayCalc> = {};
  
  // First pass: calculate worked minutes per day
  let totalWorked = 0;
  const dayWorked: Record<string, number> = {};
  
  for (const day of DAYS) {
    const { workedMinutes } = calcDay(days[day]);
    dayWorked[day] = workedMinutes;
    totalWorked += workedMinutes;
  }

  // Second pass: distribute straight time vs overtime based on 40hr weekly threshold
  // Overtime only kicks in after 40 total hours are reached
  let cumulativeMinutes = 0;
  
  for (const day of DAYS) {
    const worked = dayWorked[day];
    
    if (worked === 0) {
      result[day] = { workedMinutes: 0, straightMinutes: 0, overtimeMinutes: 0 };
      continue;
    }

    const prevCumulative = cumulativeMinutes;
    cumulativeMinutes += worked;

    let straightMinutes = 0;
    let overtimeMinutes = 0;

    if (prevCumulative >= WEEKLY_OT_THRESHOLD) {
      // Already past 40hrs, all hours today are overtime
      overtimeMinutes = worked;
    } else if (cumulativeMinutes <= WEEKLY_OT_THRESHOLD) {
      // Still under 40hrs, all hours today are straight time
      straightMinutes = worked;
    } else {
      // Crossed 40hrs threshold today - split the hours
      straightMinutes = WEEKLY_OT_THRESHOLD - prevCumulative;
      overtimeMinutes = cumulativeMinutes - WEEKLY_OT_THRESHOLD;
    }

    result[day] = { workedMinutes: worked, straightMinutes, overtimeMinutes };
  }

  // Calculate totals
  const totalStraight = Math.min(totalWorked, WEEKLY_OT_THRESHOLD);
  const totalOvertime = Math.max(totalWorked - WEEKLY_OT_THRESHOLD, 0);

  return {
    days: result,
    totalWorkedMinutes: totalWorked,
    totalStraightMinutes: totalStraight,
    totalOvertimeMinutes: totalOvertime,
  };
}

/** Format minutes → { hrs, min } */
export function splitHM(minutes: number): { hrs: number; min: number } {
  return { hrs: Math.floor(minutes / 60), min: minutes % 60 };
}

/** Format minutes → "H:MM" display string */
export function fmtHM(minutes: number): string {
  if (!minutes) return '';
  const { hrs, min } = splitHM(minutes);
  return `${hrs}:${String(min).padStart(2, '0')}`;
}
