import { Timesheet } from '../types';

const STORAGE_KEY = 'sos_timesheets';

export function newSOSTimesheet(staffName = ''): Timesheet {
  return {
    id: `sos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    staff_name: staffName,
    pay_period_start: '',
    pay_period_end: '',
    entries: [],
  };
}

export function loadAllSOS(): Timesheet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSOSTimesheet(ts: Timesheet): Timesheet {
  const all = loadAllSOS();
  const idx = all.findIndex(t => t.id === ts.id);
  if (idx >= 0) {
    all[idx] = ts;
  } else {
    all.unshift(ts);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return ts;
}

export function deleteSOSTimesheet(id: string): void {
  const all = loadAllSOS().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
