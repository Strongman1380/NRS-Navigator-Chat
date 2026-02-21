// ─── Audit Status Options ──────────────────────────────────────────────────
export const AUDIT_STATUSES = [
  "Passed",
  "Needs Correction",
  "Failed - Do Not Bill",
];

// ─── Clinical Note Quality Scale ───────────────────────────────────────────
export const NOTE_QUALITY_SCALE = ["1", "2", "3", "4", "5"];

export const NOTE_QUALITY_LABELS = {
  "1": "Inadequate — Missing required elements",
  "2": "Poor — Major deficiencies",
  "3": "Acceptable — Meets minimum standards",
  "4": "Good — Clear and thorough",
  "5": "Excellent — Exemplary documentation",
};

// ─── Audit Item Categories ─────────────────────────────────────────────────
export const AUDIT_CATEGORIES = [
  "Intake & Admin",
  "Assessment",
  "Treatment Plan",
  "Progress Notes",
  "Community/Support",
];

// ─── Audit Item Definitions ────────────────────────────────────────────────
// type: "checkbox" (Pass/Fail), "scale" (1-5 dropdown)
// serviceTypes: ["ALL"] = universal, or specific codes like ["SA"], ["CTA"]
export const AUDIT_ITEMS = [
  // ── Intake & Admin ──
  {
    key: "consents_valid_and_signed",
    label: "Consents Valid and Signed",
    type: "checkbox",
    category: "Intake & Admin",
    serviceTypes: ["ALL"],
    guidance:
      "Nebraska Medicaid requires general consent, telehealth consent (if applicable), and treatment consent to be signed and dated BEFORE the first billed service. Verify all three are present and dated prior to the first session date in the audit period. Missing or late consents are a common audit finding and can result in recoupment of all billed services.",
  },
  {
    key: "advance_directive_documented",
    label: "Advance Directive Documented",
    type: "checkbox",
    category: "Intake & Admin",
    serviceTypes: ["ALL"],
    guidance:
      "Mandatory for adults age 18+. The clinical record must document that the client was offered information about Advance Mental Health Directives per Nebraska state law. For minors, this item should still be documented as reviewed. Failure to document this offering is a compliance finding even if the client declines.",
  },
  // ── Assessment ──
  {
    key: "idi_completed_and_signed",
    label: "IDI Completed and Signed",
    type: "checkbox",
    category: "Assessment",
    serviceTypes: ["ALL"],
    guidance:
      "The Initial Diagnostic Interview (IDI) must be present, completed in a timely manner per service type rules, and signed by an eligible supervisor if the rendering provider holds a provisional license (PLMHP). MH: within 30 days of admission. SA: within 15 days. CTA/CS: within 30 days. Check that the IDI date falls within the required window and includes all required elements: presenting problem, history, mental status, diagnosis, and treatment recommendations.",
  },
  {
    key: "functional_impairment_met",
    label: "Functional Impairment Documented",
    type: "checkbox",
    category: "Assessment",
    serviceTypes: ["ALL"],
    guidance:
      "This is a strict Nebraska DHHS rule. The diagnosis must clearly document a functional impairment interfering with at least one life domain: family, school/work, or community functioning. A diagnosis code alone is insufficient — there must be a narrative description of HOW the condition impairs the client's daily functioning. Nebraska auditors specifically look for this and will deny claims where functional impairment is not clearly articulated.",
  },
  {
    key: "sud_asam_criteria_met",
    label: "SUD ASAM Criteria Met",
    type: "checkbox",
    category: "Assessment",
    serviceTypes: ["SA"],
    guidance:
      "For Substance Abuse services: verify that ASAM (American Society of Addiction Medicine) criteria were used to determine the appropriate level of care. The assessment must document the ASAM dimension scores across all six dimensions and justify the current level of treatment. Nebraska Medicaid requires ASAM-based placement for all SUD services.",
  },
  // ── Treatment Plan ──
  {
    key: "treatment_plan_active",
    label: "Treatment Plan Active and Current",
    type: "checkbox",
    category: "Treatment Plan",
    serviceTypes: ["ALL"],
    guidance:
      "The treatment plan must be current (not expired) for the ENTIRE audit period. Review timelines by service type — MH: every 180 days, SA: every 30 days, CTA: every 90 days, CS: every 90 days. The plan must include: measurable goals, specific interventions, responsible parties, target dates, and transition/discharge planning. Any service billed during a lapsed treatment plan period is subject to recoupment.",
  },
  {
    key: "goals_match_interventions",
    label: "Goals Match Billed Interventions",
    type: "checkbox",
    category: "Treatment Plan",
    serviceTypes: ["ALL"],
    guidance:
      "Every billed service must correspond to a goal and intervention listed on the active treatment plan. Cross-reference each session note against treatment plan goals. If a session addresses a goal not on the plan, or if the billed service type is not listed as an intervention, this is a finding. The treatment plan must specifically name the service type (e.g., 'Community Treatment Aide services to...').",
  },
  // ── Progress Notes ──
  {
    key: "exact_timestamps_verified",
    label: "Exact Timestamps Verified",
    type: "checkbox",
    category: "Progress Notes",
    serviceTypes: ["ALL"],
    guidance:
      "Nebraska auditors specifically and heavily penalize rounded times. Session notes MUST show exact start and end times in minutes (e.g., 9:07 AM – 9:52 AM), NOT rounded to the quarter hour (e.g., 9:00 AM – 10:00 AM). Also verify that no two services for the same client overlap in time, and that the documented duration matches the start/end times. Copy-pasted or identical durations across multiple notes are a red flag.",
  },
  {
    key: "clinical_note_quality",
    label: "Clinical Note Quality",
    type: "scale",
    category: "Progress Notes",
    serviceTypes: ["ALL"],
    guidance:
      "Rate overall note quality across the audit period on a 1-5 scale. Notes must clearly document: (1) the specific clinical intervention used during the session, (2) the client's observable response to the intervention, and (3) measurable progress or lack of progress toward treatment plan goals. Generic statements like 'client participated in session' or 'discussed coping skills' are insufficient. Each note should be individualized and reflect the unique content of that specific session.",
  },
  {
    key: "supervisory_signoff_present",
    label: "Supervisory Sign-off Present",
    type: "checkbox",
    category: "Progress Notes",
    serviceTypes: ["ALL"],
    guidance:
      "Required when services are provided by a provisionally licensed provider (PLMHP), Community Treatment Aide (CTA), or Community Support Worker. The supervising practitioner (LMHP, LIMHP, or licensed psychologist) must co-sign notes within the timeframe required by Nebraska regulation. Verify: (1) the supervisor's credentials are documented, (2) sign-off is timely (not backdated weeks later), and (3) the supervisor has reviewed and approved the clinical content, not just signed.",
  },
  // ── Community/Support ──
  {
    key: "care_coordination_verified",
    label: "Care Coordination Verified",
    type: "checkbox",
    category: "Community/Support",
    serviceTypes: ["ALL"],
    guidance:
      "There must be documented proof of coordination with other providers involved in the client's care (e.g., psychiatrist/prescriber, school counselor, probation officer, PCP, DHHS case worker). Look for: coordination notes, documented phone calls, team meeting minutes, or email summaries in the record. Nebraska Medicaid expects active care coordination, especially for clients receiving multiple services.",
  },
  {
    key: "referral_loop_closed",
    label: "Referral Loop Closed",
    type: "checkbox",
    category: "Community/Support",
    serviceTypes: ["ALL"],
    guidance:
      "When a referral is made to an outside agency or provider, there MUST be a follow-up note documenting the outcome of that referral. An open referral without documented follow-up is a compliance finding. Check that every referral made during the audit period has a corresponding outcome note (e.g., 'Client connected with XYZ agency on [date]' or 'Client declined referral, documented on [date]').",
  },
  {
    key: "cta_therapist_collaboration",
    label: "CTA-Therapist Collaboration",
    type: "checkbox",
    category: "Community/Support",
    serviceTypes: ["CTA"],
    guidance:
      "For CTA services: verify documented collaboration between the Community Treatment Aide and the supervising therapist/LMHP. This includes: regular supervision meetings (typically weekly or biweekly), therapist input on treatment plan goals for CTA, coordinated goal-setting, and documented communication about client progress. Check for supervision logs, co-signed documentation, and evidence that the CTA is working under clinical direction.",
  },
];

// ─── Helper: get items applicable to a service type ────────────────────────
export function getAuditItemsForService(serviceType) {
  if (!serviceType) return [];
  return AUDIT_ITEMS.filter(
    (item) =>
      item.serviceTypes.includes("ALL") ||
      item.serviceTypes.includes(serviceType)
  );
}

// ─── Helper: get items grouped by category ─────────────────────────────────
export function getAuditItemsByCategory(serviceType) {
  const items = getAuditItemsForService(serviceType);
  const grouped = {};
  for (const cat of AUDIT_CATEGORIES) {
    const catItems = items.filter((item) => item.category === cat);
    if (catItems.length > 0) {
      grouped[cat] = catItems;
    }
  }
  return grouped;
}
