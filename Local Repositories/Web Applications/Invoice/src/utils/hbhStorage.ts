import { HBHTimesheet, WeekDays, DAYS } from '../types/hbh';

const STORAGE_KEY = 'hbh_timesheets';

function emptyDay() {
  return { timeIn: '', lunchOut: '', lunchIn: '', timeOut: '' };
}

export function emptyWeekDays(): WeekDays {
  return Object.fromEntries(DAYS.map(d => [d, emptyDay()])) as WeekDays;
}

export function newTimesheet(employeeName = ''): HBHTimesheet {
  return {
    id: `hbh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeName,
    weekEndingDate: '',
    days: emptyWeekDays(),
    mailCheck: '',
    pickupCheck: '',
    signatureDataUrl: '',
    signatureDate: '',
    savedAt: new Date().toISOString(),
  };
}

export function loadAll(): HBHTimesheet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTimesheet(ts: HBHTimesheet): HBHTimesheet {
  const updated = { ...ts, savedAt: new Date().toISOString() };
  const all = loadAll();
  const idx = all.findIndex(t => t.id === ts.id);
  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.unshift(updated);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return updated;
}

export function deleteTimesheet(id: string): void {
  const all = loadAll().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
