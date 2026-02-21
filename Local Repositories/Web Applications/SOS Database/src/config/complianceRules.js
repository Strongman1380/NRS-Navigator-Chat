// Nebraska Medicaid compliance timelines by service type
export const COMPLIANCE_RULES = {
  MH: {
    treatmentPlanReviewDays: 180,   // every 6 months
    initialAssessmentDays: 30,      // within 30 days of admission
    dischargePlanDays: 30,          // within 30 days of admission
  },
  SA: {
    treatmentPlanReviewDays: 30,    // every 30 days (supervising practitioner review)
    initialAssessmentDays: 15,      // within 15 days of admission
    dischargePlanDays: 30,
  },
  CTA: {
    treatmentPlanReviewDays: 90,    // every 90 days or sooner
    initialAssessmentDays: 30,
    dischargePlanDays: 30,
  },
  CS: {
    treatmentPlanReviewDays: 90,    // every 90 days
    initialAssessmentDays: 30,
    dischargePlanDays: 30,
  },
};

// Universal rules
export const CONSENT_RENEWAL_DAYS = 365;  // annual
export const ALERT_THRESHOLDS = [30, 14, 7]; // days before due

// Urgency level based on days remaining
export function getUrgency(daysUntil) {
  if (daysUntil <= 0) return "overdue";
  if (daysUntil <= 7) return "critical";
  if (daysUntil <= 14) return "warning";
  return "notice";
}

// Urgency display styles
export const URGENCY_STYLES = {
  overdue:  { bg: "bg-red-50",    border: "border-red-300",    text: "text-red-700",    label: "Overdue" },
  critical: { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-600",    label: "Due in 7 days" },
  warning:  { bg: "bg-orange-50", border: "border-amber-200",  text: "text-orange-600", label: "Due in 14 days" },
  notice:   { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", label: "Due in 30 days" },
};
