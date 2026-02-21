import React, { useState } from "react";
import { LucideIcon } from "../../components/LucideIcon";
import { Button } from "../../components/Button";
import { InputField } from "../../components/InputField";
import { EMPTY_AUDIT, SERVICE_TYPES, SERVICE_BADGE_STYLES } from "../../config/constants";
import {
  getAuditItemsByCategory,
  AUDIT_STATUSES,
  NOTE_QUALITY_LABELS,
  NOTE_QUALITY_SCALE,
} from "../../config/auditConfig";

// ─── Helper: get active service codes for a client ───────────────────────────
function getActiveServices(client) {
  if (!client || !client.services) return [];
  return Object.entries(client.services)
    .filter(([, svc]) => svc.active)
    .map(([code]) => code);
}

// ─────────────────────────────────────────────────────────────────────────────
// AuditForm Component
// ─────────────────────────────────────────────────────────────────────────────
export function AuditForm({ client, audit, onSave, onClose }) {
  const editing = !!audit;

  // ─── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(() => {
    if (audit) return { ...EMPTY_AUDIT, ...audit };
    return {
      ...EMPTY_AUDIT,
      clientId: client.id,
      clientName: client.clientName,
      masterCaseNumber: client.masterCaseNumber || "",
    };
  });

  // Track expanded comment and guidance panels per item
  const [expandedComments, setExpandedComments] = useState({});
  const [expandedGuidance, setExpandedGuidance] = useState({});

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleComment = (key) => {
    setExpandedComments((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleGuidance = (key) => {
    setExpandedGuidance((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── Service type change handler ───────────────────────────────────────────
  const handleServiceTypeChange = (type) => {
    setForm((prev) => ({ ...prev, serviceType: type }));
  };

  // ─── Validation & save ─────────────────────────────────────────────────────
  const handleSave = () => {
    if (
      !form.audit_date ||
      !form.auditor_name ||
      !form.serviceType ||
      !form.audit_period_start ||
      !form.audit_period_end
    ) {
      alert(
        "Please fill in all required fields: Auditor Name, Audit Date, Audit Period Start/End, and Service Type."
      );
      return;
    }
    onSave(form);
  };

  // ─── Derived data ─────────────────────────────────────────────────────────
  const activeServiceCodes = getActiveServices(client);
  const categorizedItems = form.serviceType
    ? getAuditItemsByCategory(form.serviceType)
    : {};

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 flex flex-col max-h-[90vh]">
        {/* ─── Sticky Header ──────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="text-lg font-bold text-gray-800">
              {editing ? "Edit QA Audit" : "New QA Audit"} &mdash;{" "}
              {client.clientName}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              title="Close"
            >
              <LucideIcon name="X" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Scrollable Body ────────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {/* ─── 1. Metadata ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Auditor Name"
              value={form.auditor_name}
              onChange={(v) => updateField("auditor_name", v)}
              required
              placeholder="Full name"
            />
            <InputField
              label="Audit Date"
              type="date"
              value={form.audit_date}
              onChange={(v) => updateField("audit_date", v)}
              required
            />
            <InputField
              label="Audit Period Start"
              type="date"
              value={form.audit_period_start}
              onChange={(v) => updateField("audit_period_start", v)}
              required
            />
            <InputField
              label="Audit Period End"
              type="date"
              value={form.audit_period_end}
              onChange={(v) => updateField("audit_period_end", v)}
              required
            />
          </div>

          {/* ─── 2. Service Type Selector ─────────────────────────────────── */}
          {activeServiceCodes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {activeServiceCodes.map((code) => {
                  const badge = SERVICE_BADGE_STYLES[code];
                  const svc = SERVICE_TYPES[code];
                  const isSelected = form.serviceType === code;
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

          {/* ─── 3. Audit Checklist ───────────────────────────────────────── */}
          {form.serviceType &&
            Object.entries(categorizedItems).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {category}
                </h3>

                {items.map((item) => {
                  const commentKey = item.key + "_comment";
                  return (
                    <div
                      key={item.key}
                      className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2"
                    >
                      {/* Item header row */}
                      <div className="flex items-center justify-between gap-3">
                        {/* Label + info icon */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-800">
                            {item.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleGuidance(item.key)}
                            className={`p-0.5 rounded transition-colors flex-shrink-0 ${
                              expandedGuidance[item.key]
                                ? "text-blue-600"
                                : "text-gray-400 hover:text-blue-500"
                            }`}
                            title="Toggle guidance"
                          >
                            <LucideIcon name="Info" className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Pass/Fail or Scale controls */}
                        {item.type === "checkbox" && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateField(
                                  item.key,
                                  form[item.key] === true ? null : true
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                form[item.key] === true
                                  ? "bg-green-100 text-green-700 border-green-300"
                                  : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              Pass
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateField(
                                  item.key,
                                  form[item.key] === false ? null : false
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                form[item.key] === false
                                  ? "bg-red-100 text-red-700 border-red-300"
                                  : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              Fail
                            </button>
                          </div>
                        )}

                        {item.type === "scale" && (
                          <div className="flex items-center gap-2">
                            <select
                              value={form[item.key] || ""}
                              onChange={(e) =>
                                updateField(item.key, e.target.value)
                              }
                              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white cursor-pointer"
                            >
                              <option value="">Score...</option>
                              {NOTE_QUALITY_SCALE.map((val) => (
                                <option key={val} value={val}>
                                  {val}
                                </option>
                              ))}
                            </select>
                            {form[item.key] && (
                              <span className="text-xs text-gray-500 max-w-[180px] truncate">
                                {NOTE_QUALITY_LABELS[form[item.key]]}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Guidance panel */}
                      {expandedGuidance[item.key] && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                          <p className="text-sm text-blue-800">
                            {item.guidance}
                          </p>
                        </div>
                      )}

                      {/* Comment toggle + textarea */}
                      {!expandedComments[item.key] ? (
                        <button
                          type="button"
                          onClick={() => toggleComment(item.key)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                        >
                          <LucideIcon
                            name="MessageSquarePlus"
                            className="w-3.5 h-3.5"
                          />
                          Add Comment
                        </button>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">
                              Comment
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleComment(item.key)}
                              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              Hide
                            </button>
                          </div>
                          <textarea
                            value={form[commentKey] || ""}
                            onChange={(e) =>
                              updateField(commentKey, e.target.value)
                            }
                            rows={2}
                            placeholder="Add a comment for this item..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y bg-white"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

          {/* ─── 4. Overall Result ────────────────────────────────────────── */}
          {form.serviceType && (
            <div className="border-t border-gray-200 pt-6 mt-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Overall Result
              </h3>
              <InputField
                label="Audit Status"
                type="select"
                value={form.audit_status}
                onChange={(v) => updateField("audit_status", v)}
                options={AUDIT_STATUSES}
              />
              <InputField
                label="Corrective Action Notes"
                type="textarea"
                value={form.corrective_action_notes}
                onChange={(v) => updateField("corrective_action_notes", v)}
                rows={4}
                placeholder="Describe any corrective actions required..."
              />
            </div>
          )}

          {/* ─── 5. Save Button ───────────────────────────────────────────── */}
          <div className="pt-4">
            <Button
              onClick={handleSave}
              iconName={editing ? "Save" : "PlusCircle"}
              className="w-full sm:w-auto"
            >
              {editing ? "Update Audit" : "Save Audit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
