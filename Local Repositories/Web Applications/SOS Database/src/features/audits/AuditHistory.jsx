import React, { useMemo } from "react";
import { LucideIcon } from "../../components/LucideIcon";
import { Button } from "../../components/Button";
import { SERVICE_TYPES, SERVICE_BADGE_STYLES } from "../../config/constants";
import { formatDate } from "../../utils/dateHelpers";

const AUDIT_STATUS_STYLES = {
  Passed: "bg-green-100 text-green-700 border border-green-200",
  "Needs Correction": "bg-amber-100 text-amber-700 border border-amber-200",
  "Failed - Do Not Bill": "bg-red-100 text-red-700 border border-red-200",
};

export function AuditHistory({ audits, onViewAudit, onNewAudit, isDischarged }) {
  const sortedAudits = useMemo(
    () =>
      [...audits].sort((a, b) =>
        (b.audit_date || "").localeCompare(a.audit_date || "")
      ),
    [audits]
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <LucideIcon name="ClipboardCheck" className="w-5 h-5 text-gray-500" />
          <h3 className="text-base font-semibold text-gray-900">
            QA Audits ({audits.length})
          </h3>
        </div>
        {!isDischarged && (
          <Button
            variant="primary"
            iconName="Plus"
            onClick={onNewAudit}
            className="text-sm"
          >
            New Audit
          </Button>
        )}
      </div>

      <div className="p-6">
        {sortedAudits.length === 0 ? (
          <div className="text-center py-8">
            <LucideIcon
              name="ClipboardCheck"
              className="w-10 h-10 text-gray-300 mx-auto mb-3"
            />
            <p className="text-sm text-gray-500 mb-3">No audits yet</p>
            {!isDischarged && (
              <Button
                variant="primary"
                iconName="Plus"
                onClick={onNewAudit}
              >
                Create First Audit
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAudits.map((audit) => {
              const svc = SERVICE_TYPES[audit.serviceType];
              const badge = SERVICE_BADGE_STYLES[audit.serviceType];
              const statusStyle =
                AUDIT_STATUS_STYLES[audit.audit_status] || "";
              return (
                <button
                  key={audit.id}
                  onClick={() => onViewAudit(audit)}
                  className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(audit.audit_date)}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {svc && badge && (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {svc.label}
                            </span>
                          )}
                          {audit.auditor_name && (
                            <span className="text-xs text-gray-500">
                              {audit.auditor_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {audit.audit_status && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle}`}
                        >
                          {audit.audit_status}
                        </span>
                      )}
                      <LucideIcon
                        name="ChevronRight"
                        className="w-4 h-4 text-gray-400"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
