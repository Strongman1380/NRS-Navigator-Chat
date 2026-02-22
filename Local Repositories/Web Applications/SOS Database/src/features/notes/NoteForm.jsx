import React, { useState } from "react";
import { LucideIcon } from "../../components/LucideIcon";
import { Button } from "../../components/Button";
import { InputField } from "../../components/InputField";
import {
  SERVICE_TYPES,
  SERVICE_BADGE_STYLES,
  EMPTY_ENTRY,
  GOAL_RATINGS,
  THERAPY_MODALITIES,
  SERVICE_LOCATIONS,
} from "../../config/constants";
import { formatDate, todayStr, calcDuration } from "../../utils/dateHelpers";

// ─── CTA-specific field keys ─────────────────────────────────────────────────
const CTA_FIELDS = [
  "caseOpened",
  "goalsForCTAProvider",
  "goalWorkedOn",
  "currentRatingOfGoal",
  "changesToADL",
  "additionalServicesNeeded",
  "additionalServicesDescription",
  "familyInvolvementNote",
];

// ─── MH-specific field keys ──────────────────────────────────────────────────
const MH_FIELDS = [
  "therapyModality",
  "clinicalFindings",
  "mentalStatusExam",
  "diagnosticImpression",
];

// ─── SA-specific field keys ──────────────────────────────────────────────────
const SA_FIELDS = ["substanceUseStatus", "clinicalFindings", "supervisionNotes"];

// ─── CS-specific field keys ──────────────────────────────────────────────────
const CS_FIELDS = [
  "referralAgency",
  "referralOutcome",
  "careCoordinationNote",
  "familyInvolvementNote",
];

// ─── All service-specific keys grouped by type ───────────────────────────────
const SPECIFIC_FIELDS_BY_TYPE = {
  CTA: CTA_FIELDS,
  MH: MH_FIELDS,
  SA: SA_FIELDS,
  CS: CS_FIELDS,
};

// ─── Title map ───────────────────────────────────────────────────────────────
const FORM_TITLES = {
  CTA: "Daily Progress Report",
  MH: "Mental Health Session Note",
  SA: "Substance Abuse Progress Note",
  CS: "Community Support Note",
};

// ─── Helper: get active service codes for a client ───────────────────────────
function getActiveServices(client) {
  if (!client || !client.services) return [];
  return Object.entries(client.services)
    .filter(([, svc]) => svc.active)
    .map(([code]) => code);
}

// ─── Helper: clear fields not belonging to the selected service type ─────────
function clearOtherServiceFields(form, keepType) {
  const cleared = { ...form };
  Object.entries(SPECIFIC_FIELDS_BY_TYPE).forEach(([type, fields]) => {
    if (type === keepType) return;
    fields.forEach((key) => {
      // Keep shared keys that also belong to the selected type
      const keepFields = SPECIFIC_FIELDS_BY_TYPE[keepType] || [];
      if (!keepFields.includes(key)) {
        cleared[key] = EMPTY_ENTRY[key] ?? "";
      }
    });
  });
  return cleared;
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NoteForm Component
// ─────────────────────────────────────────────────────────────────────────────
export function NoteForm({
  clients,
  entryForm,
  setEntryForm,
  editingEntryId,
  onSave,
  onCancelEdit,
}) {
  // Filter clients: non-discharged with at least one active service
  const eligibleClients = (clients || []).filter((c) => {
    if (c.isDischarged) return false;
    return getActiveServices(c).length > 0;
  });

  // Currently selected client
  const selectedClient = eligibleClients.find(
    (c) => c.id === entryForm.clientId
  );
  const activeServiceCodes = getActiveServices(selectedClient);

  // ─── Update helper ──────────────────────────────────────────────────────────
  const updateField = (key, value) => {
    const updated = { ...entryForm, [key]: value };

    // Auto-calculate length of service when times change
    if (key === "timeStart" || key === "timeEnd") {
      const start = key === "timeStart" ? value : entryForm.timeStart;
      const end = key === "timeEnd" ? value : entryForm.timeEnd;
      updated.lengthOfService = calcDuration(start, end);
    }

    setEntryForm(updated);
  };

  // ─── Client selection handler ───────────────────────────────────────────────
  const handleClientSelect = (clientId) => {
    const client = eligibleClients.find((c) => c.id === clientId);
    if (!client) {
      // Cleared selection
      setEntryForm({ ...entryForm, clientId: "", clientName: "", masterCaseNumber: "", serviceType: "", selectedGoals: [], treatmentPlanGoals: "" });
      return;
    }

    const services = getActiveServices(client);
    const autoServiceType = services.length === 1 ? services[0] : "";

    const updated = {
      ...entryForm,
      clientId: client.id,
      clientName: client.clientName,
      masterCaseNumber: client.masterCaseNumber || "",
      selectedGoals: [],
      goalRatings: {},
      treatmentPlanGoals: "",
      serviceType: autoServiceType,
      referralAgency: client.referralAgency || "",
      referralOutcome: client.referralOutcome || "",
      selectedParticipants: ["Client"],
      participants: "Client",
    };

    // For CTA, pre-fill caseOpened from client
    if (autoServiceType === "CTA" && client.caseOpenedDate) {
      updated.caseOpened = client.caseOpenedDate;
    }

    setEntryForm(updated);
  };

  // ─── Service type change handler ────────────────────────────────────────────
  const handleServiceTypeChange = (type) => {
    let updated = { ...entryForm, serviceType: type };
    updated = clearOtherServiceFields(updated, type);

    // For CTA, pre-fill caseOpened from client
    if (type === "CTA" && selectedClient?.caseOpenedDate) {
      updated.caseOpened = selectedClient.caseOpenedDate;
    }

    // For CS, pre-fill referral fields from client profile if currently blank
    if (type === "CS" && selectedClient) {
      if (!updated.referralAgency) updated.referralAgency = selectedClient.referralAgency || "";
      if (!updated.referralOutcome) updated.referralOutcome = selectedClient.referralOutcome || "";
    }

    setEntryForm(updated);
  };

  // ─── Goal checkbox handler ──────────────────────────────────────────────────
  const handleGoalToggle = (goalText) => {
    const current = entryForm.selectedGoals || [];
    let next;
    const newRatings = { ...(entryForm.goalRatings || {}) };
    if (current.includes(goalText)) {
      next = current.filter((g) => g !== goalText);
      delete newRatings[goalText];
    } else {
      next = [...current, goalText];
    }
    setEntryForm({
      ...entryForm,
      selectedGoals: next,
      goalRatings: newRatings,
      treatmentPlanGoals: next.join("; "),
    });
  };

  // ─── Goal rating handler ────────────────────────────────────────────────────
  const handleGoalRating = (goalText, rating) => {
    setEntryForm({
      ...entryForm,
      goalRatings: { ...(entryForm.goalRatings || {}), [goalText]: rating },
    });
  };

  // ─── Participant toggle handler ─────────────────────────────────────────────
  const handleParticipantToggle = (name) => {
    const current = entryForm.selectedParticipants || [];
    let next;
    if (current.includes(name)) {
      next = current.filter((p) => p !== name);
    } else {
      next = [...current, name];
    }
    setEntryForm({
      ...entryForm,
      selectedParticipants: next,
      participants: next.join(", "),
    });
  };

  const svcType = entryForm.serviceType;
  const formTitle = FORM_TITLES[svcType] || "Progress Note";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {editingEntryId ? "Edit Progress Report" : "New Daily Progress Report"}
          </h1>
        </div>
        {editingEntryId && (
          <Button variant="secondary" iconName="X" onClick={onCancelEdit}>
            Cancel Edit
          </Button>
        )}
      </div>

      {/* ─── Form Card ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* ─── SOS Header ──────────────────────────────────────────────────── */}
        <div className="border-b border-gray-200 px-6 py-5 text-center">
          <h2 className="text-lg font-bold text-[var(--brand-red)]">
            SOS COUNSELING, LLC
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            1811 West Second Street, Suite 450, Grand Island, NE 68801
          </p>
          <p className="text-sm font-semibold text-gray-700 mt-2">
            {formTitle}
          </p>
        </div>

        {/* ─── Form Body ───────────────────────────────────────────────────── */}
        <div className="p-6 space-y-8">
          {/* ─── A. Client & Service Selection ─────────────────────────────── */}
          <Section title="Client & Service">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                value={entryForm.clientId || ""}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-all duration-200 bg-white cursor-pointer"
              >
                <option value="">Select a client...</option>
                {eligibleClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName}
                    {c.masterCaseNumber ? ` (${c.masterCaseNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Type Selector (pill buttons) */}
            {entryForm.clientId && activeServiceCodes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {activeServiceCodes.map((code) => {
                    const badge = SERVICE_BADGE_STYLES[code];
                    const svc = SERVICE_TYPES[code];
                    const isSelected = entryForm.serviceType === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleServiceTypeChange(code)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                          isSelected
                            ? `${badge.bg} ${badge.text} ${badge.border} ring-2 ring-offset-1 ring-current`
                            : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <LucideIcon name={svc.icon} className="w-4 h-4" />
                          {svc.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>

          {/* ─── B. Common Fields ──────────────────────────────────────────── */}
          {entryForm.serviceType && (
            <>
              <Section title="Session Details">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <InputField
                    label="Date"
                    type="date"
                    value={entryForm.date}
                    onChange={(v) => updateField("date", v)}
                    required
                  />
                  <InputField
                    label="Time Start"
                    type="time"
                    value={entryForm.timeStart}
                    onChange={(v) => updateField("timeStart", v)}
                  />
                  <InputField
                    label="Time End"
                    type="time"
                    value={entryForm.timeEnd}
                    onChange={(v) => updateField("timeEnd", v)}
                  />
                </div>

                {entryForm.lengthOfService && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Length of Service:</span>{" "}
                    {entryForm.lengthOfService}
                  </p>
                )}

                <InputField
                  label="Service Location"
                  type="select"
                  value={entryForm.serviceLocation}
                  onChange={(v) => updateField("serviceLocation", v)}
                  options={SERVICE_LOCATIONS}
                />

                {/* ─── Participants ────────────────────────────────────────── */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Participants</p>
                  {selectedClient ? (
                    <div className="flex flex-wrap gap-2">
                      {["Client", ...(selectedClient.familyMembers || []).filter(Boolean)].map((name) => {
                        const checked = (entryForm.selectedParticipants || []).includes(name);
                        return (
                          <label
                            key={name}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                              checked
                                ? "bg-red-50 border-red-300 text-red-700"
                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleParticipantToggle(name)}
                              className="sr-only"
                            />
                            <LucideIcon name={checked ? "CheckCircle" : "Circle"} className="w-3.5 h-3.5" />
                            {name}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <InputField
                      value={entryForm.participants}
                      onChange={(v) => updateField("participants", v)}
                      placeholder="e.g. Client, Mother, CTA"
                    />
                  )}
                  {selectedClient && entryForm.participants && (
                    <p className="text-xs text-gray-400 mt-1">Present: {entryForm.participants}</p>
                  )}
                </div>

                {entryForm.serviceLocation === "Telehealth" && (
                  <InputField
                    label="Telehealth Details"
                    type="textarea"
                    value={entryForm.telehealthDetails}
                    onChange={(v) => updateField("telehealthDetails", v)}
                    placeholder="Platform used, connectivity notes, etc."
                    rows={2}
                  />
                )}
              </Section>

              {/* ─── Treatment Plan Goals ────────────────────────────────────── */}
              <Section title="Treatment Plan Goals">
                {selectedClient?.treatmentGoals?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClient.treatmentGoals.map((goal, idx) => {
                      const goalText = typeof goal === "string" ? goal : goal?.text || "";
                      const isChecked = (entryForm.selectedGoals || []).includes(goalText);
                      const showRating = isChecked && (svcType === "CTA" || svcType === "CS");
                      const currentRating = (entryForm.goalRatings || {})[goalText] || "";
                      return (
                        <div key={idx} className="rounded-lg border border-gray-200 overflow-hidden">
                          <label className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleGoalToggle(goalText)}
                              className="mt-0.5 rounded border-gray-300 text-[var(--brand-red)] focus:ring-[var(--brand-red)]"
                            />
                            <span className="text-sm text-gray-700">{goalText}</span>
                          </label>
                          {showRating && (
                            <div className="px-3 pb-3 bg-gray-50 border-t border-gray-100">
                              <p className="text-xs font-medium text-gray-500 mb-2 mt-2">
                                Progress Rating
                                <span className="font-normal text-gray-400 ml-1">
                                  (1 = significant regression · 5 = stable · 10 = significant progress)
                                </span>
                              </p>
                              <div className="flex gap-1 flex-wrap">
                                {GOAL_RATINGS.map((r) => {
                                  const n = parseInt(r);
                                  const isSelected = currentRating === r;
                                  const colorClass =
                                    n <= 3
                                      ? isSelected
                                        ? "bg-red-500 text-white border-red-500"
                                        : "border-red-200 text-red-600 hover:bg-red-50"
                                      : n <= 6
                                      ? isSelected
                                        ? "bg-yellow-500 text-white border-yellow-500"
                                        : "border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                                      : isSelected
                                      ? "bg-green-500 text-white border-green-500"
                                      : "border-green-200 text-green-700 hover:bg-green-50";
                                  return (
                                    <button
                                      key={r}
                                      type="button"
                                      onClick={() => handleGoalRating(goalText, r)}
                                      className={`w-8 h-8 rounded-full border text-xs font-semibold transition-colors ${colorClass}`}
                                    >
                                      {r}
                                    </button>
                                  );
                                })}
                              </div>
                              {currentRating && (
                                <p className="text-xs mt-1.5 text-gray-500">
                                  Selected: <span className="font-semibold">{currentRating}/10</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No treatment goals defined for this client. Add goals in the client profile.
                  </p>
                )}
              </Section>

              {/* ─── C. CTA-Specific Fields ──────────────────────────────────── */}
              {svcType === "CTA" && (
                <Section title="CTA Details">
                  <InputField
                    label="Case Opened"
                    type="date"
                    value={entryForm.caseOpened}
                    onChange={(v) => updateField("caseOpened", v)}
                  />
                  <InputField
                    label="Goals for CTA Provider"
                    type="textarea"
                    value={entryForm.goalsForCTAProvider}
                    onChange={(v) => updateField("goalsForCTAProvider", v)}
                    rows={3}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="Goal Worked On"
                      value={entryForm.goalWorkedOn}
                      onChange={(v) => updateField("goalWorkedOn", v)}
                    />
                    <InputField
                      label="Current Rating of Goal"
                      type="select"
                      value={entryForm.currentRatingOfGoal}
                      onChange={(v) => updateField("currentRatingOfGoal", v)}
                      options={GOAL_RATINGS}
                      placeholder="1-10"
                    />
                  </div>
                  <InputField
                    label="Intervention/Outcomes"
                    type="textarea"
                    value={entryForm.interventionOutcomes}
                    onChange={(v) => updateField("interventionOutcomes", v)}
                    rows={4}
                    required
                  />
                  <InputField
                    label="Progress Made"
                    type="textarea"
                    value={entryForm.progressMade}
                    onChange={(v) => updateField("progressMade", v)}
                    rows={3}
                  />
                  <InputField
                    label="Plan for Next Session"
                    type="textarea"
                    value={entryForm.planForNextSession}
                    onChange={(v) => updateField("planForNextSession", v)}
                    rows={3}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="Changes to ADL"
                      type="select"
                      value={entryForm.changesToADL}
                      onChange={(v) => updateField("changesToADL", v)}
                      options={["Yes", "No"]}
                    />
                    <InputField
                      label="Additional Services Needed"
                      type="select"
                      value={entryForm.additionalServicesNeeded}
                      onChange={(v) => updateField("additionalServicesNeeded", v)}
                      options={["Yes", "No"]}
                    />
                  </div>
                  {entryForm.additionalServicesNeeded === "Yes" && (
                    <InputField
                      label="Additional Services Description"
                      type="textarea"
                      value={entryForm.additionalServicesDescription}
                      onChange={(v) => updateField("additionalServicesDescription", v)}
                      rows={3}
                    />
                  )}
                  <InputField
                    label="Family Involvement Note"
                    type="textarea"
                    value={entryForm.familyInvolvementNote}
                    onChange={(v) => updateField("familyInvolvementNote", v)}
                    rows={3}
                  />
                </Section>
              )}

              {/* ─── D. MH-Specific Fields ───────────────────────────────────── */}
              {svcType === "MH" && (
                <Section title="Mental Health Details">
                  <InputField
                    label="Therapy Modality"
                    type="select"
                    value={entryForm.therapyModality}
                    onChange={(v) => updateField("therapyModality", v)}
                    options={THERAPY_MODALITIES}
                  />
                  <InputField
                    label="Clinical Findings"
                    type="textarea"
                    value={entryForm.clinicalFindings}
                    onChange={(v) => updateField("clinicalFindings", v)}
                    rows={4}
                  />
                  <InputField
                    label="Mental Status Exam"
                    type="textarea"
                    value={entryForm.mentalStatusExam}
                    onChange={(v) => updateField("mentalStatusExam", v)}
                    rows={4}
                  />
                  <InputField
                    label="Diagnostic Impression"
                    type="textarea"
                    value={entryForm.diagnosticImpression}
                    onChange={(v) => updateField("diagnosticImpression", v)}
                    rows={3}
                  />
                  <InputField
                    label="Intervention/Outcomes"
                    type="textarea"
                    value={entryForm.interventionOutcomes}
                    onChange={(v) => updateField("interventionOutcomes", v)}
                    rows={4}
                    required
                  />
                  <InputField
                    label="Progress Made"
                    type="textarea"
                    value={entryForm.progressMade}
                    onChange={(v) => updateField("progressMade", v)}
                    rows={3}
                  />
                  <InputField
                    label="Plan for Next Session"
                    type="textarea"
                    value={entryForm.planForNextSession}
                    onChange={(v) => updateField("planForNextSession", v)}
                    rows={3}
                  />
                </Section>
              )}

              {/* ─── E. SA-Specific Fields ───────────────────────────────────── */}
              {svcType === "SA" && (
                <Section title="Substance Abuse Details">
                  <InputField
                    label="Substance Use Status"
                    type="textarea"
                    value={entryForm.substanceUseStatus}
                    onChange={(v) => updateField("substanceUseStatus", v)}
                    rows={3}
                  />
                  <InputField
                    label="Clinical Findings"
                    type="textarea"
                    value={entryForm.clinicalFindings}
                    onChange={(v) => updateField("clinicalFindings", v)}
                    rows={4}
                  />
                  <InputField
                    label="Supervision Notes"
                    type="textarea"
                    value={entryForm.supervisionNotes}
                    onChange={(v) => updateField("supervisionNotes", v)}
                    rows={3}
                  />
                  <InputField
                    label="Intervention/Outcomes"
                    type="textarea"
                    value={entryForm.interventionOutcomes}
                    onChange={(v) => updateField("interventionOutcomes", v)}
                    rows={4}
                    required
                  />
                  <InputField
                    label="Progress Made"
                    type="textarea"
                    value={entryForm.progressMade}
                    onChange={(v) => updateField("progressMade", v)}
                    rows={3}
                  />
                  <InputField
                    label="Plan for Next Session"
                    type="textarea"
                    value={entryForm.planForNextSession}
                    onChange={(v) => updateField("planForNextSession", v)}
                    rows={3}
                  />
                </Section>
              )}

              {/* ─── F. CS-Specific Fields ───────────────────────────────────── */}
              {svcType === "CS" && (
                <Section title="Community Support Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="Referral Agency"
                      value={entryForm.referralAgency}
                      onChange={(v) => updateField("referralAgency", v)}
                    />
                    <InputField
                      label="Referral Outcome"
                      value={entryForm.referralOutcome}
                      onChange={(v) => updateField("referralOutcome", v)}
                    />
                  </div>
                  <InputField
                    label="Care Coordination Note"
                    type="textarea"
                    value={entryForm.careCoordinationNote}
                    onChange={(v) => updateField("careCoordinationNote", v)}
                    rows={3}
                  />
                  <InputField
                    label="Family Involvement Note"
                    type="textarea"
                    value={entryForm.familyInvolvementNote}
                    onChange={(v) => updateField("familyInvolvementNote", v)}
                    rows={3}
                  />
                  <InputField
                    label="Intervention/Outcomes"
                    type="textarea"
                    value={entryForm.interventionOutcomes}
                    onChange={(v) => updateField("interventionOutcomes", v)}
                    rows={4}
                    required
                  />
                  <InputField
                    label="Progress Made"
                    type="textarea"
                    value={entryForm.progressMade}
                    onChange={(v) => updateField("progressMade", v)}
                    rows={3}
                  />
                  <InputField
                    label="Plan for Next Session"
                    type="textarea"
                    value={entryForm.planForNextSession}
                    onChange={(v) => updateField("planForNextSession", v)}
                    rows={3}
                  />
                </Section>
              )}

              {/* ─── G. Signature Section ────────────────────────────────────── */}
              <div className="border-t border-gray-200 pt-6">
                <Section title="Signature">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="Provider Signature"
                      value={entryForm.providerSignature}
                      onChange={(v) => updateField("providerSignature", v)}
                      placeholder="Full name"
                    />
                    <InputField
                      label="Signature Date"
                      type="date"
                      value={entryForm.signatureDate}
                      onChange={(v) => updateField("signatureDate", v)}
                    />
                  </div>
                </Section>
              </div>

              {/* ─── H. Save Button ──────────────────────────────────────────── */}
              <div className="pt-4">
                <Button
                  onClick={onSave}
                  iconName={editingEntryId ? "Save" : "PlusCircle"}
                  className="w-full sm:w-auto"
                >
                  {editingEntryId ? "Update Progress Report" : "Save Progress Report"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
