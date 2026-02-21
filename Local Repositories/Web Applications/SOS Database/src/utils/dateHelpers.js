// Format "2024-01-15" to "01/15/2024"
export function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

// Format "14:30" to "2:30 PM"
export function formatTime12h(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Today as "YYYY-MM-DD"
export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Parse "YYYY-MM-DD" to Date object (at midnight local time)
export function parseDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Add days to a Date object, return new Date
export function addDays(date, days) {
  if (!date) return null;
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Difference in days between two Date objects (positive = future)
export function diffDays(from, to) {
  if (!from || !to) return Infinity;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((to - from) / msPerDay);
}

// Calculate duration between two time strings (e.g. "09:00" and "10:30")
export function calcDuration(timeStart, timeEnd) {
  if (!timeStart || !timeEnd) return "";
  const [h1, m1] = timeStart.split(":").map(Number);
  const [h2, m2] = timeEnd.split(":").map(Number);
  const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (totalMinutes <= 0) return "";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

// Check if a client is under 21 based on DOB
export function isUnder21(dateOfBirth) {
  if (!dateOfBirth) return false;
  const dob = parseDate(dateOfBirth);
  if (!dob) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age < 21;
}
