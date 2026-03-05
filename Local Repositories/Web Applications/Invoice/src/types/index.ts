// Timesheet Entry
export interface TimesheetEntry {
  id: string;
  date: string;          // MM/DD/YYYY
  billing_code: string;
  hours: number;
  client: string;
  direct: boolean;
  indirect: boolean;
  mileage: number;
  notes: string;
}

// Timesheet
export interface Timesheet {
  id: string;
  staff_name: string;
  pay_period_start: string; // MM/DD/YYYY
  pay_period_end: string;   // MM/DD/YYYY
  entries: TimesheetEntry[];
}

// API Response
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
