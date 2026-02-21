import React, { useState } from "react";
import { LucideIcon } from "../../components/LucideIcon";
import { Button } from "../../components/Button";
import { SERVICE_TYPES, SERVICE_BADGE_STYLES } from "../../config/constants";
import { getAuditItemsByCategory, NOTE_QUALITY_LABELS } from "../../config/auditConfig";
import { formatDate } from "../../utils/dateHelpers";

const InfoItem = ({ label, value }) =>
  value ? (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800 mt-0.5">{value}</dd>
    </div>
  ) : null;

const AUDIT_STATUS_STYLES = {
  Passed: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  "Needs Correction": { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  "Failed - Do Not Bill": { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
};

export function AuditViewModal({ audit, onClose, onEdit, onDelete }) {
  const [guideExpanded, setGuideExpanded] = useState(false);

  if (!audit) return null;

  const serviceLabel = SERVICE_TYPES[audit.serviceType]?.label || audit.serviceType;
  const serviceStyle = SERVICE_BADGE_STYLES[audit.serviceType] || {};
  const categorizedItems = getAuditItemsByCategory(audit.serviceType);
  const statusStyle = AUDIT_STATUS_STYLES[audit.audit_status] || AUDIT_STATUS_STYLES["Needs Correction"];

  const renderCheckboxValue = (value) => {
    if (value === true) {
      return (
        <span className="inline-flex items-center gap-1.5 text-green-600">
          <LucideIcon name="CheckCircle" className="w-4 h-4" />
          <span className="text-sm font-medium">Pass</span>
        </span>
      );
    }
    if (value === false) {
      return (
        <span className="inline-flex items-center gap-1.5 text-red-600">
          <LucideIcon name="XCircle" className="w-4 h-4" />
          <span className="text-sm font-medium">Fail</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-gray-400">
        <LucideIcon name="MinusCircle" className="w-4 h-4" />
        <span className="text-sm font-medium">Not Assessed</span>
      </span>
    );
  };

  const renderScaleValue = (value) => {
    if (value == null) {
      return (
        <span className="inline-flex items-center gap-1.5 text-gray-400">
          <LucideIcon name="MinusCircle" className="w-4 h-4" />
          <span className="text-sm font-medium">Not Assessed</span>
        </span>
      );
    }
    const label = NOTE_QUALITY_LABELS[String(value)] || `${value}/5`;
    return (
      <span className="text-sm text-gray-800 font-medium">
        {value}/5 — {label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 flex flex-col max-h-[90vh]">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="text-lg font-bold text-gray-800">
              QA Audit — {audit.clientName}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              title="Close"
            >
              <LucideIcon name="X" className="w-5 h-5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" iconName="Pencil" onClick={onEdit} className="text-sm !px-3 !py-1.5">
              Edit
            </Button>
            <Button variant="danger" iconName="Trash2" onClick={onDelete} className="text-sm !px-3 !py-1.5">
              Delete
            </Button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 rounded-lg p-4">
            <InfoItem label="Audit Date" value={formatDate(audit.audit_date)} />
            <InfoItem label="Auditor Name" value={audit.auditor_name} />
            <InfoItem
              label="Audit Period"
              value={
                audit.audit_period_start && audit.audit_period_end
                  ? `${formatDate(audit.audit_period_start)} — ${formatDate(audit.audit_period_end)}`
                  : null
              }
            />
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Service Type</dt>
              <dd className="mt-0.5">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${serviceStyle.bg} ${serviceStyle.text} ${serviceStyle.border}`}
                >
                  <LucideIcon name={SERVICE_TYPES[audit.serviceType]?.icon || "FileText"} className="w-4 h-4 mr-1.5" />
                  {serviceLabel}
                </span>
              </dd>
            </div>
          </div>

          {/* Checklist items by category */}
          <div className="mb-6">
            {Object.entries(categorizedItems).map(([category, items]) => (
              <div key={category} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="space-y-3">
                  {items.map((item) => {
                    const value = audit[item.key];
                    const comment = audit[item.key + "_comment"];

                    return (
                      <div key={item.key} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm text-gray-800 font-medium">{item.label}</span>
                          {item.type === "scale"
                            ? renderScaleValue(value)
                            : renderCheckboxValue(value)}
                        </div>
                        {comment && (
                          <div className="mt-2 bg-gray-50 rounded-md p-2.5">
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{comment}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Overall Result */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Overall Result</h3>
            <div className="mb-4">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
              >
                {audit.audit_status}
              </span>
            </div>
            {audit.corrective_action_notes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Corrective Action Notes</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                  {audit.corrective_action_notes}
                </p>
              </div>
            )}
          </div>

          {/* Auditor Reference Guide (collapsible) */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <button
              onClick={() => setGuideExpanded(!guideExpanded)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors w-full text-left"
            >
              <LucideIcon
                name={guideExpanded ? "ChevronUp" : "ChevronDown"}
                className="w-4 h-4"
              />
              Auditor Reference Guide
            </button>
            {guideExpanded && (
              <div className="mt-4 space-y-4">
                {Object.entries(categorizedItems).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {category}
                    </h4>
                    <div className="space-y-3">
                      {items.map((item) => {
                        const value = audit[item.key];
                        // Only show guidance for items that were actually assessed
                        if (value == null) return null;
                        return (
                          <div key={item.key} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">{item.label}</p>
                            <p className="text-sm text-gray-600">{item.guidance}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
