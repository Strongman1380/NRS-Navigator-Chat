import React, { useState } from "react";
import { LucideIcon } from "../../components/LucideIcon";
import { Button } from "../../components/Button";
import { InputField } from "../../components/InputField";
import {
  SERVICE_TYPES,
  SERVICE_CODES,
  SERVICE_BADGE_STYLES,
  EMPTY_CLIENT,
  EMPTY_SERVICE,
  GOAL_RATINGS,
  GUARDIAN_STATUSES,
  LANGUAGES,
} from "../../config/constants";
import { isUnder21 } from "../../utils/dateHelpers";

export function ClientForm({ client, editingId, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_CLIENT, ...client });
  const [expandedServices, setExpandedServices] = useState(() => {
    const initial = {};
    SERVICE_CODES.forEach((code) => {
      if (form.services?.[code]?.active) initial[code] = true;
    });
    return initial;
  });

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateService = (code, field, value) =>
    setForm((prev) => ({
      ...prev,
      services: {
        ...prev.services,
        [code]: { ...(prev.services[code] || { ...EMPTY_SERVICE }), [field]: value },
      },
    }));

  const toggleService = (code) => {
    const isActive = form.services?.[code]?.active;
    if (isActive) {
      // Deactivate
      updateService(code, "active", false);
      setExpandedServices((prev) => ({ ...prev, [code]: false }));
    } else {
      // Activate
      setForm((prev) => ({
        ...prev,
        services: {
          ...prev.services,
          [code]: { ...EMPTY_SERVICE, ...(prev.services[code] || {}), active: true },
        },
      }));
      setExpandedServices((prev) => ({ ...prev, [code]: true }));
    }
  };

  const toggleServiceExpand = (code) => {
    if (form.services?.[code]?.active) {
      setExpandedServices((prev) => ({ ...prev, [code]: !prev[code] }));
    }
  };

  // Treatment goals
  const addGoal = () => update("treatmentGoals", [...(form.treatmentGoals || []), ""]);
  const removeGoal = (idx) =>
    update(
      "treatmentGoals",
      (form.treatmentGoals || []).filter((_, i) => i !== idx)
    );
  const updateGoal = (idx, value) => {
    const goals = [...(form.treatmentGoals || [])];
    goals[idx] = value;
    update("treatmentGoals", goals);
  };

  const handleSave = () => {
    if (!form.clientName.trim()) return;
    onSave(form);
  };

  const under21 = isUnder21(form.dateOfBirth);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white rounded-t-xl border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {editingId ? "Edit Client" : "Add New Client"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <LucideIcon name="X" className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* ─── A. Basic Info ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Basic Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Client Name"
                value={form.clientName}
                onChange={(v) => update("clientName", v)}
                required
                className="md:col-span-2"
              />
              <InputField
                label="Master Case #"
                value={form.masterCaseNumber}
                onChange={(v) => update("masterCaseNumber", v)}
              />
              <InputField
                label="Case Opened Date"
                type="date"
                value={form.caseOpenedDate}
                onChange={(v) => update("caseOpenedDate", v)}
              />
            </div>
          </section>

          {/* ─── B. Demographics ───────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Demographics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Date of Birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(v) => update("dateOfBirth", v)}
              />
              <InputField
                label="Medicaid Member ID"
                value={form.medicaidMemberId}
                onChange={(v) => update("medicaidMemberId", v)}
              />
              <InputField
                label="Primary Language"
                type="select"
                options={LANGUAGES}
                value={form.primaryLanguage}
                onChange={(v) => update("primaryLanguage", v)}
              />
              <InputField
                label="Legal Guardian Status"
                type="select"
                options={GUARDIAN_STATUSES}
                value={form.legalGuardianStatus}
                onChange={(v) => update("legalGuardianStatus", v)}
              />
            </div>

            {/* Consent */}
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consentOnFile || false}
                  onChange={(e) => update("consentOnFile", e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Consent on File</span>
              </label>

              {form.consentOnFile && (
                <InputField
                  label="Consent Signed Date"
                  type="date"
                  value={form.consentSignedDate}
                  onChange={(v) => update("consentSignedDate", v)}
                  className="max-w-xs"
                />
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.advanceDirectiveOnFile || false}
                  onChange={(e) => update("advanceDirectiveOnFile", e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Advance Directive on File</span>
              </label>
            </div>
          </section>

          {/* ─── C. Services ───────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Services
            </h3>

            {/* Toggle Buttons Row */}
            <div className="flex flex-wrap gap-2 mb-4">
              {SERVICE_CODES.map((code) => {
                const svc = SERVICE_TYPES[code];
                const badge = SERVICE_BADGE_STYLES[code];
                const isActive = form.services?.[code]?.active;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleService(code)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                      isActive
                        ? `${badge.bg} ${badge.text} ${badge.border}`
                        : "bg-gray-100 text-gray-400 border-gray-200"
                    }`}
                  >
                    {svc.label}
                  </button>
                );
              })}
            </div>

            {/* Expanded Service Sections */}
            {SERVICE_CODES.map((code) => {
              const svc = SERVICE_TYPES[code];
              const badge = SERVICE_BADGE_STYLES[code];
              const isActive = form.services?.[code]?.active;
              const isExpanded = expandedServices[code];
              const data = form.services?.[code] || {};

              if (!isActive) return null;

              return (
                <div key={code} className={`border ${badge.border} rounded-lg mb-3 overflow-hidden`}>
                  <button
                    type="button"
                    onClick={() => toggleServiceExpand(code)}
                    className={`w-full flex items-center justify-between px-4 py-3 ${badge.bg} ${badge.text} font-medium text-sm`}
                  >
                    <span className="flex items-center gap-2">
                      <LucideIcon name={svc.icon} className="w-4 h-4" />
                      {svc.label} ({code})
                    </span>
                    <LucideIcon
                      name={isExpanded ? "ChevronUp" : "ChevronDown"}
                      className="w-4 h-4"
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-4 py-4 space-y-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                          label="Service Start Date"
                          type="date"
                          value={data.serviceStartDate}
                          onChange={(v) => updateService(code, "serviceStartDate", v)}
                        />
                        <InputField
                          label="Service End Date"
                          type="date"
                          value={data.serviceEndDate}
                          onChange={(v) => updateService(code, "serviceEndDate", v)}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField
                          label="Auth Reference #"
                          value={data.authReferenceNumber}
                          onChange={(v) => updateService(code, "authReferenceNumber", v)}
                        />
                        <InputField
                          label="Auth Start Date"
                          type="date"
                          value={data.authStartDate}
                          onChange={(v) => updateService(code, "authStartDate", v)}
                        />
                        <InputField
                          label="Auth End Date"
                          type="date"
                          value={data.authEndDate}
                          onChange={(v) => updateService(code, "authEndDate", v)}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField
                          label="CPT/HCPCS Code"
                          value={data.approvedCptHcpcs}
                          onChange={(v) => updateService(code, "approvedCptHcpcs", v)}
                        />
                        <InputField
                          label="Modifiers"
                          value={data.approvedModifiers}
                          onChange={(v) => updateService(code, "approvedModifiers", v)}
                        />
                        <InputField
                          label="ICD-10 Code"
                          value={data.primaryIcd10Code}
                          onChange={(v) => updateService(code, "primaryIcd10Code", v)}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                          label="Total Units Approved"
                          value={data.totalUnitsApproved}
                          onChange={(v) => updateService(code, "totalUnitsApproved", v)}
                        />
                        <InputField
                          label="Frequency Limits"
                          value={data.frequencyLimits}
                          onChange={(v) => updateService(code, "frequencyLimits", v)}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField
                          label="Initial Assessment Date"
                          type="date"
                          value={data.initialAssessmentDate}
                          onChange={(v) => updateService(code, "initialAssessmentDate", v)}
                        />
                        <InputField
                          label="Last Treatment Plan Review"
                          type="date"
                          value={data.lastTreatmentPlanReview}
                          onChange={(v) => updateService(code, "lastTreatmentPlanReview", v)}
                        />
                        <InputField
                          label="Discharge Plan Date"
                          type="date"
                          value={data.dischargePlanDate}
                          onChange={(v) => updateService(code, "dischargePlanDate", v)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* ─── D. Treatment Goals ────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Treatment Goals
            </h3>
            <div className="space-y-2">
              {(form.treatmentGoals || []).map((goal, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-sm font-medium text-gray-400 mt-2 min-w-[24px]">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => updateGoal(idx, e.target.value)}
                    placeholder={`Goal ${idx + 1}`}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeGoal(idx)}
                    className="text-red-400 hover:text-red-600 mt-2 transition-colors"
                    title="Remove goal"
                  >
                    <LucideIcon name="Trash2" className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addGoal}
              className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <LucideIcon name="Plus" className="w-4 h-4" />
              Add Goal
            </button>
          </section>

          {/* ─── E. Medical & EPSDT ────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Medical{under21 ? " & EPSDT" : ""}
            </h3>
            <div className="space-y-4">
              <InputField
                label="Medication Log"
                type="textarea"
                value={form.medicationLog}
                onChange={(v) => update("medicationLog", v)}
                rows={3}
              />
              <InputField
                label="Medical Studies/Results"
                type="textarea"
                value={form.medicalStudiesResults}
                onChange={(v) => update("medicalStudiesResults", v)}
                rows={3}
              />
              {under21 && (
                <>
                  <InputField
                    label="EPSDT Screenings"
                    type="textarea"
                    value={form.epsdtScreenings}
                    onChange={(v) => update("epsdtScreenings", v)}
                    rows={3}
                  />
                  <InputField
                    label="EPSDT Education"
                    type="textarea"
                    value={form.epsdtEducation}
                    onChange={(v) => update("epsdtEducation", v)}
                    rows={3}
                  />
                </>
              )}
            </div>
          </section>

          {/* ─── F. Community Tracking ─────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Community Tracking
            </h3>
            <div className="space-y-4">
              <InputField
                label="Family Involvement Log"
                type="textarea"
                value={form.familyInvolvementLog}
                onChange={(v) => update("familyInvolvementLog", v)}
                rows={3}
              />
              <InputField
                label="Care Coordination Log"
                type="textarea"
                value={form.careCoordinationLog}
                onChange={(v) => update("careCoordinationLog", v)}
                rows={3}
              />
              <InputField
                label="Emergency Encounter"
                type="textarea"
                value={form.emergencyEncounter}
                onChange={(v) => update("emergencyEncounter", v)}
                rows={3}
              />
            </div>
          </section>

          {/* ─── G. Notes ──────────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Notes
            </h3>
            <InputField
              type="textarea"
              value={form.notes}
              onChange={(v) => update("notes", v)}
              rows={4}
              placeholder="General notes..."
            />
          </section>
        </div>

        {/* Footer Buttons */}
        <div className="sticky bottom-0 bg-white rounded-b-xl border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.clientName.trim()}>
            {editingId ? "Save Changes" : "Add Client"}
          </Button>
        </div>
      </div>
    </div>
  );
}
