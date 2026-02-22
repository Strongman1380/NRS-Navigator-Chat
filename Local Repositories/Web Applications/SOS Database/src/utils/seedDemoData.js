import { COLLECTIONS, EMPTY_CLIENT, EMPTY_ENTRY, EMPTY_AUDIT, EMPTY_SERVICE } from "../config/constants";

/**
 * Seeds Firestore with realistic demo data for presentations.
 * Creates 5 clients, ~15 case notes, and 4 audits.
 */
export async function seedDemoData(db) {
  const now = new Date().toISOString();
  const batch = db.batch();

  // ─── 5 Demo Clients ──────────────────────────────────────────────────────

  const clientDefs = [
    {
      clientName: "Martinez, Sofia",
      masterCaseNumber: "MC-2025-0412",
      caseOpenedDate: "2025-06-15",
      dateOfBirth: "2001-03-22",
      medicaidMemberId: "NE8834201",
      primaryLanguage: "Spanish",
      legalGuardianStatus: "Self",
      consentOnFile: true,
      consentSignedDate: "2025-06-15",
      advanceDirectiveOnFile: true,
      services: {
        MH: { ...EMPTY_SERVICE, active: true, serviceStartDate: "2025-06-15", authStartDate: "2025-06-15", authEndDate: "2026-06-14", authReferenceNumber: "AUTH-MH-44921", primaryIcd10Code: "F32.1", approvedCptHcpcs: "90837", totalUnitsApproved: "52", unitsUsed: 28, initialAssessmentDate: "2025-06-15", lastTreatmentPlanReview: "2025-12-10" },
        SA: { ...EMPTY_SERVICE, active: true, serviceStartDate: "2025-08-01", authStartDate: "2025-08-01", authEndDate: "2026-07-31", authReferenceNumber: "AUTH-SA-55102", primaryIcd10Code: "F10.20", approvedCptHcpcs: "90847", totalUnitsApproved: "40", unitsUsed: 14, initialAssessmentDate: "2025-08-01", lastTreatmentPlanReview: "2025-12-10" },
      },
      treatmentGoals: [
        { id: "g1", text: "Reduce depressive symptoms from PHQ-9 score 18 to below 10", rating: "5" },
        { id: "g2", text: "Maintain sobriety and attend weekly AA meetings", rating: "6" },
      ],
    },
    {
      clientName: "Johnson, Tyler",
      masterCaseNumber: "MC-2025-0518",
      caseOpenedDate: "2025-09-02",
      dateOfBirth: "2010-11-14",
      medicaidMemberId: "NE7721034",
      primaryLanguage: "English",
      legalGuardianStatus: "State Ward",
      consentOnFile: true,
      consentSignedDate: "2025-09-02",
      advanceDirectiveOnFile: false,
      services: {
        CTA: { ...EMPTY_SERVICE, active: true, serviceStartDate: "2025-09-02", authStartDate: "2025-09-01", authEndDate: "2026-03-01", authReferenceNumber: "AUTH-CTA-33087", primaryIcd10Code: "F91.1", approvedCptHcpcs: "H2019", totalUnitsApproved: "120", unitsUsed: 62, initialAssessmentDate: "2025-09-05", lastTreatmentPlanReview: "2025-12-18" },
        MH: { ...EMPTY_SERVICE, active: true, serviceStartDate: "2025-09-10", authStartDate: "2025-09-01", authEndDate: "2026-03-01", authReferenceNumber: "AUTH-MH-44955", primaryIcd10Code: "F91.1", approvedCptHcpcs: "90834", totalUnitsApproved: "26", unitsUsed: 12, initialAssessmentDate: "2025-09-10", lastTreatmentPlanReview: "2025-12-18" },
      },
      treatmentGoals: [
        { id: "g1", text: "Reduce aggressive outbursts from 5/week to 1/week or less", rating: "4" },
        { id: "g2", text: "Complete homework 4 out of 5 school days per week", rating: "3" },
        { id: "g3", text: "Use coping skills when frustrated instead of physical aggression", rating: "4" },
      ],
    },
    {
      clientName: "Williams, Angela",
      masterCaseNumber: "MC-2024-0891",
      caseOpenedDate: "2024-11-20",
      dateOfBirth: "1985-07-08",
      medicaidMemberId: "NE6609812",
      primaryLanguage: "English",
      legalGuardianStatus: "Self",
      consentOnFile: true,
      consentSignedDate: "2024-11-20",
      advanceDirectiveOnFile: true,
      services: {
        CS: { ...EMPTY_SERVICE, active: true, serviceStartDate: "2024-11-20", authStartDate: "2024-11-20", authEndDate: "2025-11-19", authReferenceNumber: "AUTH-CS-22045", primaryIcd10Code: "F33.1", approvedCptHcpcs: "H0036", totalUnitsApproved: "80", unitsUsed: 55, initialAssessmentDate: "2024-11-22", lastTreatmentPlanReview: "2025-05-15" },
        MH: { ...EMPTY_SERVICE, active: true, serviceStartDate: "2024-11-20", authStartDate: "2024-11-20", authEndDate: "2025-11-19", authReferenceNumber: "AUTH-MH-44800", primaryIcd10Code: "F33.1", approvedCptHcpcs: "90837", totalUnitsApproved: "48", unitsUsed: 38, initialAssessmentDate: "2024-11-20", lastTreatmentPlanReview: "2025-05-15" },
      },
      treatmentGoals: [
        { id: "g1", text: "Secure stable housing within 60 days", rating: "8" },
        { id: "g2", text: "Attend all scheduled medical appointments", rating: "7" },
        { id: "g3", text: "Reduce anxiety symptoms and practice daily grounding techniques", rating: "6" },
      ],
    },
    {
      clientName: "Thompson, Derek",
      masterCaseNumber: "MC-2025-0723",
      caseOpenedDate: "2025-10-08",
      dateOfBirth: "1992-01-30",
      medicaidMemberId: "NE5548903",
      primaryLanguage: "English",
      legalGuardianStatus: "Self",
      consentOnFile: true,
      consentSignedDate: "2025-10-08",
      advanceDirectiveOnFile: true,
      services: {
        SA: { ...EMPTY_SERVICE, active: true, serviceStartDate: "2025-10-08", authStartDate: "2025-10-01", authEndDate: "2026-04-01", authReferenceNumber: "AUTH-SA-55200", primaryIcd10Code: "F11.20", approvedCptHcpcs: "90847", totalUnitsApproved: "48", unitsUsed: 16, initialAssessmentDate: "2025-10-10", lastTreatmentPlanReview: "2026-01-15" },
      },
      treatmentGoals: [
        { id: "g1", text: "Maintain opioid abstinence verified by monthly drug screens", rating: "7" },
        { id: "g2", text: "Develop relapse prevention plan and identify 3 triggers", rating: "8" },
      ],
    },
    {
      clientName: "Chen, Lily",
      masterCaseNumber: "MC-2026-0102",
      caseOpenedDate: "2026-01-06",
      dateOfBirth: "2008-05-19",
      medicaidMemberId: "NE9912340",
      primaryLanguage: "English",
      legalGuardianStatus: "Parent/Guardian",
      consentOnFile: true,
      consentSignedDate: "2026-01-06",
      advanceDirectiveOnFile: false,
      services: {
        MH: { ...EMPTY_SERVICE, active: true, serviceStartDate: "2026-01-06", authStartDate: "2026-01-01", authEndDate: "2026-07-01", authReferenceNumber: "AUTH-MH-45100", primaryIcd10Code: "F41.1", approvedCptHcpcs: "90834", totalUnitsApproved: "26", unitsUsed: 6, initialAssessmentDate: "2026-01-06", lastTreatmentPlanReview: "2026-01-06" },
        CTA: { ...EMPTY_SERVICE, active: true, serviceStartDate: "2026-01-13", authStartDate: "2026-01-01", authEndDate: "2026-07-01", authReferenceNumber: "AUTH-CTA-33150", primaryIcd10Code: "F41.1", approvedCptHcpcs: "H2019", totalUnitsApproved: "96", unitsUsed: 12, initialAssessmentDate: "2026-01-13", lastTreatmentPlanReview: "2026-01-06" },
      },
      treatmentGoals: [
        { id: "g1", text: "Reduce school avoidance from 3 days/week to 0", rating: "4" },
        { id: "g2", text: "Practice exposure exercises for social anxiety 3x/week", rating: "3" },
      ],
    },
    // ── TEST CLIENT A: triggers every overdue + critical alert type ──
    {
      clientName: "Ramirez, Carlos",
      masterCaseNumber: "MC-2026-TEST1",
      caseOpenedDate: "2026-01-20",
      dateOfBirth: "1990-04-15",
      medicaidMemberId: "NE1100001",
      primaryLanguage: "Spanish",
      legalGuardianStatus: "Self",
      consentOnFile: true,
      // Consent expires in 4 days → CRITICAL
      consentSignedDate: "2025-02-25",
      advanceDirectiveOnFile: false,
      services: {
        MH: {
          ...EMPTY_SERVICE, active: true,
          serviceStartDate: "2026-01-20",
          authStartDate: "2026-01-20",
          // Auth expires in 12 days → WARNING
          authEndDate: "2026-03-05",
          authReferenceNumber: "AUTH-MH-TEST1",
          primaryIcd10Code: "F31.9",
          approvedCptHcpcs: "90837",
          totalUnitsApproved: "40",
          unitsUsed: 10,
          // No initialAssessmentDate + started 2026-01-20 → MH initial due 2026-02-19 → OVERDUE
          initialAssessmentDate: "",
          lastTreatmentPlanReview: "2026-01-20",
        },
        SA: {
          ...EMPTY_SERVICE, active: true,
          serviceStartDate: "2026-01-15",
          authStartDate: "2026-01-15",
          authEndDate: "2026-07-15",
          authReferenceNumber: "AUTH-SA-TEST1",
          primaryIcd10Code: "F14.20",
          approvedCptHcpcs: "90847",
          totalUnitsApproved: "48",
          unitsUsed: 20,
          initialAssessmentDate: "2026-01-20",
          // SA review every 30 days → due 2026-02-14 → 7 days OVERDUE
          lastTreatmentPlanReview: "2026-01-15",
        },
      },
      treatmentGoals: [
        { id: "g1", text: "Stabilize mood cycling and reduce hypomanic episodes", rating: "3" },
        { id: "g2", text: "Achieve 30-day abstinence from cocaine", rating: "2" },
      ],
      notes: "TEST CLIENT — demonstrates overdue & critical alerts. Safe to delete after review.",
    },
    // ── TEST CLIENT B: triggers warning + notice alerts + units critical ──
    {
      clientName: "Patel, Priya",
      masterCaseNumber: "MC-2026-TEST2",
      caseOpenedDate: "2025-11-01",
      dateOfBirth: "2003-08-22",
      medicaidMemberId: "NE2200002",
      primaryLanguage: "English",
      legalGuardianStatus: "Parent/Guardian",
      consentOnFile: true,
      consentSignedDate: "2025-11-01",
      advanceDirectiveOnFile: true,
      services: {
        CTA: {
          ...EMPTY_SERVICE, active: true,
          serviceStartDate: "2025-11-01",
          authStartDate: "2025-11-01",
          authEndDate: "2026-05-01",
          authReferenceNumber: "AUTH-CTA-TEST2",
          primaryIcd10Code: "F90.0",
          approvedCptHcpcs: "H2019",
          // 94 of 100 units used → 94% → CRITICAL
          totalUnitsApproved: "100",
          unitsUsed: 94,
          initialAssessmentDate: "2025-11-05",
          // CTA review every 90 days → due 2026-02-18 → OVERDUE
          lastTreatmentPlanReview: "2025-11-20",
        },
        CS: {
          ...EMPTY_SERVICE, active: true,
          serviceStartDate: "2025-11-01",
          authStartDate: "2025-11-01",
          // Auth ends in 22 days → NOTICE
          authEndDate: "2026-03-15",
          authReferenceNumber: "AUTH-CS-TEST2",
          primaryIcd10Code: "F90.0",
          approvedCptHcpcs: "H0036",
          totalUnitsApproved: "80",
          unitsUsed: 40,
          initialAssessmentDate: "2025-11-05",
          lastTreatmentPlanReview: "2025-11-20",
          // Service ends in 7 days → CRITICAL
          serviceEndDate: "2026-02-28",
        },
      },
      treatmentGoals: [
        { id: "g1", text: "Improve ADHD focus and complete school tasks on time", rating: "5" },
        { id: "g2", text: "Reduce family conflict through structured communication", rating: "4" },
      ],
      notes: "TEST CLIENT — demonstrates warning, notice, units critical, and service end alerts. Safe to delete after review.",
    },
    {
      clientName: "Mac, Jordan",
      masterCaseNumber: "MC-2026-0215",
      caseOpenedDate: "2026-02-01",
      dateOfBirth: "1998-09-12",
      medicaidMemberId: "NE4401278",
      primaryLanguage: "English",
      legalGuardianStatus: "Self",
      consentOnFile: true,
      consentSignedDate: "2026-02-01",
      advanceDirectiveOnFile: true,
      services: {
        MH: { ...EMPTY_SERVICE, active: true, serviceStartDate: "2026-02-01", authStartDate: "2026-02-01", authEndDate: "2026-08-01", authReferenceNumber: "AUTH-MH-45210", primaryIcd10Code: "F43.10", approvedCptHcpcs: "90837", approvedModifiers: "GT", totalUnitsApproved: "48", unitsUsed: 3, initialAssessmentDate: "2026-02-03", lastTreatmentPlanReview: "2026-02-03" },
        CS: { ...EMPTY_SERVICE, active: true, serviceStartDate: "2026-02-01", authStartDate: "2026-02-01", authEndDate: "2026-08-01", authReferenceNumber: "AUTH-CS-22180", primaryIcd10Code: "F43.10", approvedCptHcpcs: "H0036", totalUnitsApproved: "60", unitsUsed: 4, initialAssessmentDate: "2026-02-03", lastTreatmentPlanReview: "2026-02-03" },
      },
      treatmentGoals: [
        { id: "g1", text: "Reduce PTSD symptom severity from PCL-5 score 52 to below 33", rating: "3" },
        { id: "g2", text: "Re-establish daily routine including sleep hygiene and meal schedule", rating: "4" },
        { id: "g3", text: "Connect with two community support resources within 60 days", rating: "2" },
      ],
      notes: "New client, recently relocated to Grand Island. History of trauma. Motivated for treatment.",
      medicationLog: "Sertraline 100mg daily, Prazosin 2mg at bedtime for nightmares",
    },
  ];

  // Write clients, collect refs
  const clientRefs = [];
  for (const def of clientDefs) {
    const ref = db.collection(COLLECTIONS.CLIENTS).doc();
    batch.set(ref, {
      ...EMPTY_CLIENT,
      ...def,
      isArchived: false,
      isDischarged: false,
      createdAt: now,
      updatedAt: now,
      _schemaVersion: 2,
    });
    clientRefs.push({ id: ref.id, ...def });
  }

  // ─── Case Note Entries ────────────────────────────────────────────────────

  const entryDefs = [
    // Sofia - MH notes
    { clientIdx: 0, serviceType: "MH", date: "2026-02-04", timeStart: "9:07 AM", timeEnd: "9:52 AM", serviceLocation: "Office", therapyModality: "Individual", interventionOutcomes: "Explored connection between depressive episodes and alcohol use. Client identified loneliness as primary trigger. Practiced cognitive restructuring around self-worth beliefs. Client showed increased insight into automatic negative thought patterns.", progressMade: "Client demonstrated ability to identify 3 cognitive distortions independently during session. PHQ-9 decreased from 16 to 14.", planForNextSession: "Continue CBT work on core beliefs. Introduce behavioral activation scheduling.", clinicalFindings: "Affect was congruent, mood reported as 'low but better'. No SI/HI.", mentalStatusExam: "Alert and oriented x4. Cooperative. Speech normal rate/rhythm.", diagnosticImpression: "F32.1 - Major depressive disorder, single episode, moderate. Making gradual progress." },
    { clientIdx: 0, serviceType: "MH", date: "2026-02-11", timeStart: "9:03 AM", timeEnd: "9:49 AM", serviceLocation: "Office", therapyModality: "Individual", interventionOutcomes: "Reviewed behavioral activation homework. Client completed 4 of 7 planned activities. Discussed barriers to completing remaining activities. Introduced pleasant activity scheduling for next week.", progressMade: "Client reports improved energy levels. Sleeping 6-7 hours (up from 4-5). PHQ-9 score: 12.", planForNextSession: "Review activity log. Begin work on interpersonal effectiveness skills.", clinicalFindings: "Brighter affect today. Reports feeling 'more hopeful'.", mentalStatusExam: "Alert and oriented x4. Good eye contact. Speech normal.", diagnosticImpression: "F32.1 - Continued improvement with CBT + behavioral activation." },
    { clientIdx: 0, serviceType: "MH", date: "2026-02-18", timeStart: "9:10 AM", timeEnd: "9:55 AM", serviceLocation: "Telehealth", telehealthDetails: "HIPAA-compliant video session via Doxy.me", therapyModality: "Individual", interventionOutcomes: "Telehealth session due to transportation issue. Processed stressful family interaction from weekend. Client used cognitive restructuring skills learned in previous sessions to challenge catastrophizing thoughts. Role-played assertive communication for upcoming family gathering.", progressMade: "Client successfully applied CBT skills to real-life situation independently. Reports practicing grounding techniques daily.", planForNextSession: "Follow up on family gathering. Continue interpersonal skills development.", clinicalFindings: "Mild anxiety noted but well-managed. No SI/HI.", mentalStatusExam: "Alert via video. Cooperative and engaged.", diagnosticImpression: "F32.1 - Good progress. Consider step-down frequency next month." },
    // Sofia - SA notes
    { clientIdx: 0, serviceType: "SA", date: "2026-02-06", timeStart: "1:02 PM", timeEnd: "1:48 PM", serviceLocation: "Office", interventionOutcomes: "Group therapy session - relapse prevention skills. Client shared personal triggers with group. Discussed the connection between depression and substance use. Client identified high-risk situations for the upcoming week.", progressMade: "Client reports 14 days clean. Attending AA 3x/week. Urine screen negative.", planForNextSession: "Individual session to review ASAM dimensions. Update recovery plan.", substanceUseStatus: "14 days abstinent. Last use: alcohol. Attending AA meetings regularly. Sponsor identified.", supervisionNotes: "Reviewed case with Dr. Anderson. Recommend continued integrated treatment approach." },
    // Tyler - CTA notes
    { clientIdx: 1, serviceType: "CTA", date: "2026-02-03", timeStart: "3:32 PM", timeEnd: "4:28 PM", serviceLocation: "Home", interventionOutcomes: "Home visit - practiced anger management techniques with Tyler and foster parent. Modeled deep breathing and counting to 10. Foster parent reported 2 aggressive incidents this week (down from 4 last week). Reviewed homework completion chart - Tyler completed homework 3 out of 5 days.", progressMade: "Reduction in aggressive incidents. Tyler demonstrated ability to use deep breathing when prompted. Foster parent implementing reward system.", planForNextSession: "School visit to coordinate with teacher on behavior plan. Practice coping skills in community setting.", goalWorkedOn: "Reduce aggressive outbursts", currentRatingOfGoal: "4", changesToADL: "No", additionalServicesNeeded: "No", familyInvolvementNote: "Foster parent actively engaged. Implementing behavior chart daily.", careCoordinationNote: "Coordinated with school counselor Ms. Davis re: classroom behavior plan." },
    { clientIdx: 1, serviceType: "CTA", date: "2026-02-10", timeStart: "3:15 PM", timeEnd: "4:05 PM", serviceLocation: "School", interventionOutcomes: "School visit to meet with teacher and school counselor. Observed Tyler in classroom setting for 20 minutes. Tyler was on task for approximately 15 of 20 minutes. Met with teacher to review modified behavior plan. Tyler practiced asking for help instead of shutting down.", progressMade: "Teacher reports improvement in classroom behavior. Tyler asking for breaks when frustrated. Homework completion at 80% this week.", planForNextSession: "Community outing to practice social skills with peers.", goalWorkedOn: "Complete homework 4 out of 5 school days", currentRatingOfGoal: "5", changesToADL: "No", additionalServicesNeeded: "No", careCoordinationNote: "Met with teacher Mrs. Olson and counselor Ms. Davis. Updated classroom behavior plan." },
    { clientIdx: 1, serviceType: "CTA", date: "2026-02-17", timeStart: "4:01 PM", timeEnd: "4:55 PM", serviceLocation: "Community", interventionOutcomes: "Community outing to YMCA. Tyler practiced social interactions with peers during basketball activity. Modeled appropriate conflict resolution when disagreement occurred during game. Tyler used 'I feel' statements unprompted twice.", progressMade: "Tyler showing transfer of skills to community settings. Only 1 aggressive incident at home this week.", planForNextSession: "Home visit to reinforce skills. Review progress toward treatment plan goals.", goalWorkedOn: "Use coping skills when frustrated", currentRatingOfGoal: "5", changesToADL: "No", additionalServicesNeeded: "No", familyInvolvementNote: "Foster parent reported best week yet. Tyler helped with dishes voluntarily." },
    // Angela - CS notes
    { clientIdx: 2, serviceType: "CS", date: "2026-02-05", timeStart: "10:17 AM", timeEnd: "11:08 AM", serviceLocation: "Community", interventionOutcomes: "Accompanied client to Section 8 housing office. Assisted with application paperwork. Reviewed available apartment listings. Client expressed anxiety about move but identified it as positive change. Discussed budgeting for independent living.", progressMade: "Housing application submitted. Client on waitlist (estimated 30-45 days). Client practicing daily budgeting.", planForNextSession: "Follow up on housing application. Connect with food bank resources.", referralAgency: "Grand Island Housing Authority", referralOutcome: "Section 8 application submitted, placed on priority waitlist", familyInvolvementNote: "Sister agreed to help with move when housing is secured.", careCoordinationNote: "Coordinated with case manager at Central NE Community Action re: utility assistance program." },
    { clientIdx: 2, serviceType: "CS", date: "2026-02-12", timeStart: "10:05 AM", timeEnd: "10:52 AM", serviceLocation: "Office", interventionOutcomes: "Office visit to follow up on housing and coordinate services. Housing authority confirmed application in review. Connected client with Salvation Army for furniture voucher. Reviewed medication management - client reports compliance with prescribed medications.", progressMade: "Client maintaining all scheduled appointments. Anxiety symptoms reduced per self-report.", planForNextSession: "Accompany to medical appointment on 2/19. Check on housing status.", referralAgency: "Salvation Army - Grand Island", referralOutcome: "Furniture voucher approved, $500 value", careCoordinationNote: "Called housing authority - application in final review stage." },
    // Derek - SA notes
    { clientIdx: 3, serviceType: "SA", date: "2026-02-07", timeStart: "2:12 PM", timeEnd: "2:58 PM", serviceLocation: "Office", interventionOutcomes: "Individual session focused on relapse prevention planning. Client identified 3 primary triggers: old friend group, payday stress, and insomnia. Developed specific coping strategies for each trigger. Reviewed MAT compliance - taking Suboxone as prescribed.", progressMade: "Client reports 4 months clean from opioids. Drug screen negative. Attending NA meetings 4x/week.", planForNextSession: "Begin Step 4 work. Review employment goals.", substanceUseStatus: "4 months abstinent from opioids. On Suboxone MAT. Clean drug screens x4 months.", supervisionNotes: "Staffed with Dr. Patel. Recommend continuing current MAT dosage. Good treatment engagement." },
    { clientIdx: 3, serviceType: "SA", date: "2026-02-14", timeStart: "2:05 PM", timeEnd: "2:50 PM", serviceLocation: "Office", interventionOutcomes: "Processed high-risk situation from last weekend - client ran into former using friend at gas station. Client used 'play the tape forward' technique and called sponsor instead of engaging. Reinforced coping strategies. Discussed employment readiness and reviewed resume.", progressMade: "Client successfully navigated high-risk situation without relapse. Shows strong commitment to recovery.", planForNextSession: "Connect with vocational rehabilitation services. Continue relapse prevention work.", substanceUseStatus: "Continued abstinence. Drug screen negative. MAT compliant.", supervisionNotes: "Reviewed case. Client making excellent progress. Consider step-down to biweekly sessions in 30 days." },
    // Lily - MH notes
    { clientIdx: 4, serviceType: "MH", date: "2026-02-03", timeStart: "11:05 AM", timeEnd: "11:48 AM", serviceLocation: "Office", therapyModality: "Individual", interventionOutcomes: "First therapy session post-intake. Built rapport through art-based activity. Lily drew her 'worry map' identifying school, friend conflicts, and test anxiety as primary stressors. Introduced deep breathing technique. Parent session (last 10 min) to review treatment plan goals.", progressMade: "Client engaged well despite initial reluctance. Able to articulate 5 specific worries. Demonstrated deep breathing technique.", planForNextSession: "Begin graduated exposure hierarchy for school anxiety. Introduce worry time technique.", clinicalFindings: "Anxious presentation, fidgeting, avoided eye contact initially but warmed up.", mentalStatusExam: "Alert and oriented. Anxious mood. Cooperative after initial wariness.", diagnosticImpression: "F41.1 - Generalized anxiety disorder. School avoidance is primary functional impairment." },
    { clientIdx: 4, serviceType: "MH", date: "2026-02-10", timeStart: "11:02 AM", timeEnd: "11:47 AM", serviceLocation: "Office", therapyModality: "Individual", interventionOutcomes: "Created exposure hierarchy with 10 steps from least to most anxiety-provoking school situations. Practiced relaxation techniques. Lily ranked items and identified 'walking into classroom late' as #3 anxiety trigger. Role-played scenario with successful outcome.", progressMade: "Client attended school 4 out of 5 days this week (up from 2). Used deep breathing before school each morning.", planForNextSession: "Begin in-vivo exposure to step 1 (eating lunch in cafeteria). Continue relaxation skills.", clinicalFindings: "Less anxious than initial session. Making good eye contact.", mentalStatusExam: "Alert and oriented. Mood 'okay'. Cooperative and engaged.", diagnosticImpression: "F41.1 - Early positive response to CBT exposure-based treatment." },
    // Lily - CTA note
    { clientIdx: 4, serviceType: "CTA", date: "2026-02-07", timeStart: "3:30 PM", timeEnd: "4:25 PM", serviceLocation: "Home", interventionOutcomes: "Home visit to work on school morning routine with Lily and mother. Created visual schedule for morning tasks. Practiced 'brave talk' self-statements for school anxiety. Mother demonstrated understanding of accommodation reduction plan.", progressMade: "Morning routine completed on time 3 out of 5 days this week. Mother reducing accommodation behaviors.", planForNextSession: "After-school community activity to build peer connections.", goalWorkedOn: "Reduce school avoidance", currentRatingOfGoal: "4", changesToADL: "No", additionalServicesNeeded: "No", familyInvolvementNote: "Mother highly engaged. Implementing exposure plan at home.", careCoordinationNote: "Coordinated with school counselor on attendance support plan." },
    // Mac - MH notes
    { clientIdx: 5, serviceType: "MH", date: "2026-02-05", timeStart: "10:03 AM", timeEnd: "10:51 AM", serviceLocation: "Office", therapyModality: "Individual", interventionOutcomes: "Initial therapy session following comprehensive intake. Established therapeutic rapport. Client shared trauma history in general terms without going into detail — appropriate pacing. Introduced grounding techniques (5-4-3-2-1 sensory exercise). Psychoeducation on PTSD symptoms and treatment options. Client expressed preference for CPT approach.", progressMade: "Client attended on time, engaged openly. Identified 3 primary trauma-related triggers. Successfully practiced grounding technique in session.", planForNextSession: "Begin Cognitive Processing Therapy — introduce ABC worksheets. Continue grounding skills practice.", clinicalFindings: "Hypervigilant in waiting room, relaxed somewhat during session. Reports nightmares 4-5x/week, hyperstartle response, avoidance of crowded places.", mentalStatusExam: "Alert and oriented x4. Anxious mood with congruent affect. No SI/HI. Judgment and insight fair.", diagnosticImpression: "F43.10 - Post-traumatic stress disorder. Functional impairment in social and occupational domains." },
    { clientIdx: 5, serviceType: "MH", date: "2026-02-12", timeStart: "10:07 AM", timeEnd: "10:53 AM", serviceLocation: "Office", therapyModality: "Individual", interventionOutcomes: "Introduced CPT framework and ABC model. Client completed first stuck point log identifying 'I should have been able to prevent it' as primary stuck point. Practiced Socratic questioning to examine evidence for and against this belief. Client showed strong cognitive engagement.", progressMade: "Client reports using grounding technique daily. Nightmares reduced to 3x/week. Completed homework from last session.", planForNextSession: "Continue CPT — work on challenging stuck points worksheet. Review sleep hygiene progress.", clinicalFindings: "Less hypervigilant than session 1. Making good eye contact. Tearful briefly when discussing stuck point but recovered well.", mentalStatusExam: "Alert and oriented x4. Mood 'a little better'. Cooperative.", diagnosticImpression: "F43.10 - Early engagement in CPT. Positive trajectory." },
    { clientIdx: 5, serviceType: "MH", date: "2026-02-19", timeStart: "10:05 AM", timeEnd: "10:49 AM", serviceLocation: "Telehealth", telehealthDetails: "HIPAA-compliant video via Doxy.me", therapyModality: "Individual", interventionOutcomes: "Telehealth session — client had transportation issue. Reviewed challenging beliefs worksheet. Client successfully identified 2 cognitive distortions (self-blame and overgeneralization). Introduced alternative thought generation. Discussed Prazosin effectiveness — client reports improvement in nightmare frequency.", progressMade: "Nightmares down to 1-2x/week. PCL-5 re-administered: score 44 (down from 52). Client sleeping 5-6 hours (up from 3-4).", planForNextSession: "Continue CPT module 4 — patterns of problematic thinking. Begin trauma account if client ready.", clinicalFindings: "Presenting calmer overall. Reports going to grocery store without panic for first time in months.", mentalStatusExam: "Alert via video. Good engagement. Mood 'hopeful'.", diagnosticImpression: "F43.10 - Responding well to CPT. PCL-5 showing measurable improvement." },
    // Mac - CS notes
    { clientIdx: 5, serviceType: "CS", date: "2026-02-06", timeStart: "1:12 PM", timeEnd: "1:58 PM", serviceLocation: "Community", interventionOutcomes: "Accompanied client to DHHS office to complete SNAP application. Assisted with gathering required documentation. Connected client with Grand Island Community Closet for clothing needs. Discussed employment readiness — client expressed interest in warehouse work.", progressMade: "SNAP application submitted. Client obtained state ID. Beginning to establish local support network.", planForNextSession: "Visit Goodwill workforce development program. Follow up on SNAP approval.", referralAgency: "NE DHHS - Hall County", referralOutcome: "SNAP application submitted, pending 30-day processing", familyInvolvementNote: "No local family. Client identified former coworker as informal support.", careCoordinationNote: "Coordinated with DHHS eligibility worker Sandra Torres. Application flagged for expedited review." },
    { clientIdx: 5, serviceType: "CS", date: "2026-02-13", timeStart: "1:05 PM", timeEnd: "1:52 PM", serviceLocation: "Community", interventionOutcomes: "Visited Goodwill workforce development center. Client completed job readiness assessment and enrolled in 2-week workshop starting 2/24. Followed up on SNAP — approved, EBT card arriving by mail. Connected with Salvation Army for bus pass to attend workforce program.", progressMade: "Client securing basic needs. SNAP approved. Enrolled in job readiness program. Reports feeling more settled in Grand Island.", planForNextSession: "Check in on workforce program start. Explore peer support group options for trauma survivors.", referralAgency: "Goodwill Workforce Development - Grand Island", referralOutcome: "Enrolled in 2-week job readiness workshop beginning 2/24", careCoordinationNote: "Coordinated with Goodwill intake coordinator. SNAP approval confirmed with DHHS." },
  ];

  for (const def of entryDefs) {
    const client = clientRefs[def.clientIdx];
    const ref = db.collection(COLLECTIONS.ENTRIES).doc();
    const { clientIdx, ...fields } = def;
    batch.set(ref, {
      ...EMPTY_ENTRY,
      ...fields,
      clientId: client.id,
      clientName: client.clientName,
      masterCaseNumber: client.masterCaseNumber,
      providerSignature: "Brandon Hinrichs, LIMHP",
      signatureDate: fields.date,
      createdAt: now,
      updatedAt: now,
      _schemaVersion: 2,
    });
  }

  // ─── Audit Records ────────────────────────────────────────────────────────

  const auditDefs = [
    // Passed audit for Sofia (MH)
    {
      clientIdx: 0, serviceType: "MH",
      audit_date: "2026-02-15", auditor_name: "Karen Mitchell, QA Supervisor",
      audit_period_start: "2025-12-01", audit_period_end: "2026-02-15",
      consents_valid_and_signed: true, advance_directive_documented: true,
      idi_completed_and_signed: true, functional_impairment_met: true,
      treatment_plan_active: true, goals_match_interventions: true,
      exact_timestamps_verified: true, clinical_note_quality: "4",
      supervisory_signoff_present: true, care_coordination_verified: true,
      referral_loop_closed: true,
      audit_status: "Passed",
      corrective_action_notes: "",
      clinical_note_quality_comment: "Good documentation. Clear connection between interventions and treatment goals.",
    },
    // Needs Correction audit for Tyler (CTA)
    {
      clientIdx: 1, serviceType: "CTA",
      audit_date: "2026-02-14", auditor_name: "Karen Mitchell, QA Supervisor",
      audit_period_start: "2025-12-01", audit_period_end: "2026-02-14",
      consents_valid_and_signed: true, advance_directive_documented: false,
      idi_completed_and_signed: true, functional_impairment_met: true,
      treatment_plan_active: true, goals_match_interventions: true,
      exact_timestamps_verified: false, clinical_note_quality: "3",
      supervisory_signoff_present: true, care_coordination_verified: true,
      referral_loop_closed: true, cta_therapist_collaboration: true,
      audit_status: "Needs Correction",
      corrective_action_notes: "1) Advance directive discussion not documented - must be addressed and documented within 14 days. 2) Session on 2/10 shows rounded times (3:15-4:05) - verify exact start/end times from scheduling system and correct. NE Medicaid requires exact timestamps.",
      advance_directive_documented_comment: "No documentation of advance directive discussion found in file. Required for all clients per NE DHHS.",
      exact_timestamps_verified_comment: "Session on 2/10 appears to have rounded start time. Must show exact minutes.",
      clinical_note_quality_comment: "Meets minimum standards but could improve specificity of behavioral observations.",
    },
    // Failed audit for Angela (CS) - expired auth
    {
      clientIdx: 2, serviceType: "CS",
      audit_date: "2026-02-13", auditor_name: "Karen Mitchell, QA Supervisor",
      audit_period_start: "2025-10-01", audit_period_end: "2026-02-13",
      consents_valid_and_signed: true, advance_directive_documented: true,
      idi_completed_and_signed: true, functional_impairment_met: true,
      treatment_plan_active: false, goals_match_interventions: false,
      exact_timestamps_verified: true, clinical_note_quality: "2",
      supervisory_signoff_present: true, care_coordination_verified: true,
      referral_loop_closed: true,
      audit_status: "Failed - Do Not Bill",
      corrective_action_notes: "CRITICAL: Treatment plan expired 11/19/2025 and was not renewed. All services delivered after expiration date cannot be billed to Medicaid. Provider must: 1) Complete new treatment plan review immediately, 2) Do NOT submit claims for dates of service after 11/19/2025 until new treatment plan is in place, 3) Schedule re-staffing with clinical supervisor within 7 days.",
      treatment_plan_active_comment: "Treatment plan expired 11/19/2025. No renewal on file. Services after this date are not billable.",
      goals_match_interventions_comment: "Cannot verify - treatment plan is expired. Goals from expired plan do not reflect current interventions.",
      clinical_note_quality_comment: "Notes lack sufficient clinical detail. Interventions described are vague. Must include specific techniques used and client response.",
    },
    // Passed audit for Derek (SA)
    {
      clientIdx: 3, serviceType: "SA",
      audit_date: "2026-02-16", auditor_name: "Karen Mitchell, QA Supervisor",
      audit_period_start: "2025-12-01", audit_period_end: "2026-02-16",
      consents_valid_and_signed: true, advance_directive_documented: true,
      idi_completed_and_signed: true, functional_impairment_met: true,
      treatment_plan_active: true, goals_match_interventions: true,
      exact_timestamps_verified: true, clinical_note_quality: "5",
      supervisory_signoff_present: true, care_coordination_verified: true,
      referral_loop_closed: true, sud_asam_criteria_met: true,
      audit_status: "Passed",
      corrective_action_notes: "",
      clinical_note_quality_comment: "Exemplary documentation. Clear ASAM criteria documentation, thorough progress notes, excellent integration of MAT monitoring.",
      sud_asam_criteria_met_comment: "ASAM criteria properly documented at intake and reassessed at 90-day review. Excellent.",
    },
    // Needs Correction audit for Mac (MH)
    {
      clientIdx: 5, serviceType: "MH",
      audit_date: "2026-02-20", auditor_name: "Karen Mitchell, QA Supervisor",
      audit_period_start: "2026-02-01", audit_period_end: "2026-02-20",
      consents_valid_and_signed: true, advance_directive_documented: true,
      idi_completed_and_signed: true, functional_impairment_met: true,
      treatment_plan_active: true, goals_match_interventions: true,
      exact_timestamps_verified: true, clinical_note_quality: "3",
      supervisory_signoff_present: false, care_coordination_verified: true,
      referral_loop_closed: true,
      audit_status: "Needs Correction",
      corrective_action_notes: "Supervisory co-signature missing on telehealth session note dated 2/19. PLMHP supervision requirements apply — obtain supervising practitioner co-signature within 7 days.",
      supervisory_signoff_present_comment: "Telehealth note from 2/19 missing required supervisory co-signature per NE DHHS regulation.",
      clinical_note_quality_comment: "Meets minimum standards. Recommend more detailed documentation of specific CPT techniques used in each session.",
    },
  ];

  for (const def of auditDefs) {
    const client = clientRefs[def.clientIdx];
    const ref = db.collection(COLLECTIONS.AUDITS).doc();
    const { clientIdx, ...fields } = def;
    batch.set(ref, {
      ...EMPTY_AUDIT,
      ...fields,
      clientId: client.id,
      clientName: client.clientName,
      masterCaseNumber: client.masterCaseNumber,
      createdAt: now,
      updatedAt: now,
    });
  }

  // ─── Commit all at once ─────────────────────────────────────────────────
  await batch.commit();
  return { clients: clientRefs.length, entries: entryDefs.length, audits: auditDefs.length };
}
