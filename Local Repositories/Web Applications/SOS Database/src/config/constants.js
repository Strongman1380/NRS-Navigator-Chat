// ─── Service Types ──────────────────────────────────────────────────────────
export const SERVICE_TYPES = {
  MH:  { code: "MH",  label: "Mental Health Counseling",   color: "blue",   icon: "Brain" },
  SA:  { code: "SA",  label: "Substance Abuse Counseling",  color: "purple", icon: "Heart" },
  CTA: { code: "CTA", label: "Community Treatment Aide",    color: "red",    icon: "Users" },
  CS:  { code: "CS",  label: "Community Support",           color: "green",  icon: "HandHeart" },
};

export const SERVICE_CODES = Object.keys(SERVICE_TYPES);

// ─── Service Color Maps ─────────────────────────────────────────────────────
export const SERVICE_BADGE_STYLES = {
  MH:  { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200" },
  SA:  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  CTA: { bg: "bg-red-100",    text: "text-red-700",    border: "border-red-200" },
  CS:  { bg: "bg-green-100",  text: "text-green-700",  border: "border-green-200" },
};

// ─── Firestore Collections ──────────────────────────────────────────────────
export const COLLECTIONS = {
  CLIENTS: "clients",
  ENTRIES: "entries",
  SETTINGS: "settings",
};

// ─── Goal Ratings ───────────────────────────────────────────────────────────
export const GOAL_RATINGS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

// ─── Discharge Reasons ──────────────────────────────────────────────────────
export const DISCHARGE_REASONS = [
  "Completed Treatment",
  "Moved Out of Area",
  "Non-Compliance",
  "Client Request",
  "Insurance/Authorization Ended",
  "Transferred to Another Provider",
  "Other",
];

// ─── Guardian Statuses ──────────────────────────────────────────────────────
export const GUARDIAN_STATUSES = ["Self", "Parent/Guardian", "State Ward", "Other"];

// ─── Languages ──────────────────────────────────────────────────────────────
export const LANGUAGES = ["English", "Spanish", "Arabic", "Vietnamese", "Other"];

// ─── Therapy Modalities ─────────────────────────────────────────────────────
export const THERAPY_MODALITIES = ["Individual", "Group", "Family"];

// ─── Service Locations ──────────────────────────────────────────────────────
export const SERVICE_LOCATIONS = ["Office", "Home", "Community", "School", "Telehealth"];

// ─── Empty Service Config ───────────────────────────────────────────────────
export const EMPTY_SERVICE = {
  active: true,
  serviceStartDate: "",
  serviceEndDate: "",
  authStartDate: "",
  authEndDate: "",
  authReferenceNumber: "",
  approvedCptHcpcs: "",
  approvedModifiers: "",
  primaryIcd10Code: "",
  totalUnitsApproved: "",
  unitsUsed: 0,
  frequencyLimits: "",
  initialAssessmentDate: "",
  lastTreatmentPlanReview: "",
  dischargePlanDate: "",
};

// ─── Empty Client ───────────────────────────────────────────────────────────
export const EMPTY_CLIENT = {
  id: "",
  clientName: "",
  masterCaseNumber: "",
  caseOpenedDate: "",
  // Demographics
  dateOfBirth: "",
  medicaidMemberId: "",
  primaryLanguage: "",
  legalGuardianStatus: "",
  consentOnFile: false,
  consentSignedDate: "",
  advanceDirectiveOnFile: false,
  // Services map
  services: {},
  // Treatment
  treatmentGoals: [],
  notes: "",
  // Medical & EPSDT
  medicationLog: "",
  medicalStudiesResults: "",
  epsdtScreenings: "",
  epsdtEducation: "",
  // Community tracking
  familyInvolvementLog: "",
  careCoordinationLog: "",
  emergencyEncounter: "",
  // Status
  isArchived: false,
  isDischarged: false,
  dischargeDate: "",
  dischargeReason: "",
  dischargeSummary: "",
  createdAt: "",
  updatedAt: "",
};

// ─── Empty Entry ────────────────────────────────────────────────────────────
export const EMPTY_ENTRY = {
  id: "",
  clientId: "",
  clientName: "",
  masterCaseNumber: "",
  serviceType: "",
  // Common fields
  date: "",
  timeStart: "",
  timeEnd: "",
  serviceLocation: "",
  telehealthDetails: "",
  participants: "",
  lengthOfService: "",
  treatmentPlanGoals: "",
  selectedGoals: [],
  interventionOutcomes: "",
  progressMade: "",
  planForNextSession: "",
  providerSignature: "",
  signatureDate: "",
  // CTA-specific
  caseOpened: "",
  goalsForCTAProvider: "",
  goalWorkedOn: "",
  currentRatingOfGoal: "",
  changesToADL: "No",
  additionalServicesNeeded: "No",
  additionalServicesDescription: "",
  // MH-specific
  therapyModality: "",
  clinicalFindings: "",
  mentalStatusExam: "",
  diagnosticImpression: "",
  // SA-specific
  substanceUseStatus: "",
  supervisionNotes: "",
  // CS-specific
  referralAgency: "",
  referralOutcome: "",
  // Shared CS/CTA
  familyInvolvementNote: "",
  careCoordinationNote: "",
  // Metadata
  isArchived: false,
  createdAt: "",
  updatedAt: "",
};

// ─── Empty Provider Settings ────────────────────────────────────────────────
export const EMPTY_SETTINGS = {
  billingFacilityNpi: "",
  renderingProviderNpi: "",
  taxonomyCode: "",
  practiceName: "SOS Counseling, LLC",
  practiceAddress: "1811 West Second Street, Suite 450, Grand Island, NE 68801",
};
