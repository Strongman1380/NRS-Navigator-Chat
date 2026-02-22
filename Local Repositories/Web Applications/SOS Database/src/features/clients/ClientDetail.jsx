import React from "react";
import { LucideIcon } from "../../components/LucideIcon";
import { Button } from "../../components/Button";
import { SERVICE_TYPES, SERVICE_BADGE_STYLES } from "../../config/constants";
import { URGENCY_STYLES } from "../../config/complianceRules";
import { formatDate } from "../../utils/dateHelpers";
import { AuditHistory } from "../audits/AuditHistory";

// ─── Helper: avatar initials ────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Helper: service badge ──────────────────────────────────────────────────
function ServiceBadge({ code }) {
  const svc = SERVICE_TYPES[code];
  const style = SERVICE_BADGE_STYLES[code];
  if (!svc || !style) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}
    >
      <LucideIcon name={svc.icon} className="w-3 h-3" />
      {svc.label}
    </span>
  );
}

// ─── Helper: labeled value row ──────────────────────────────────────────────
function LabelValue({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{value}</dd>
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
        {icon && <LucideIcon name={icon} className="w-5 h-5 text-gray-500" />}
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function ClientDetail({
  client,
  entries,
  alerts,
  audits,
  onBack,
  onEdit,
  onDischarge,
  onReactivate,
  onDelete,
  onViewEntry,
  onCreateNote,
  onNewAudit,
  onViewAudit,
}) {
  if (!client) return null;

  const activeServices = Object.entries(client.services || {}).filter(
    ([, svc]) => svc.active
  );

  const clientAlerts = (alerts || []).filter(
    (a) => a.clientId === client.id
  );

  const clientEntries = (entries || []).sort((a, b) =>
    (b.date || "").localeCompare(a.date || "")
  );

  const hasDemographics =
    client.dateOfBirth ||
    client.medicaidMemberId ||
    client.primaryLanguage ||
    client.legalGuardianStatus ||
    client.consentOnFile ||
    client.advanceDirectiveOnFile;

  const hasMedical =
    client.medicationLog ||
    client.medicalStudiesResults ||
    client.epsdtScreenings ||
    client.epsdtEducation;

  const hasCommunity =
    client.familyInvolvementLog ||
    client.careCoordinationLog ||
    client.emergencyEncounter;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <LucideIcon name="ArrowLeft" className="w-4 h-4" />
        Back to clients
      </button>

      {/* ─── Header Card ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-lg font-bold text-red-700 flex-shrink-0">
              {getInitials(client.clientName)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">
                  {client.clientName}
                </h1>
                {client.isDischarged && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                    Discharged
                  </span>
                )}
                {client.isArchived && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                    Archived
                  </span>
                )}
              </div>
              {client.masterCaseNumber && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Master Case #{client.masterCaseNumber}
                </p>
              )}
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              iconName="Pencil"
              onClick={onEdit}
              title="Edit client"
              className="!px-3"
            />
            {client.isDischarged ? (
              <Button
                variant="secondary"
                iconName="RotateCcw"
                onClick={onReactivate}
              >
                Reactivate
              </Button>
            ) : (
              <Button
                variant="secondary"
                iconName="UserX"
                onClick={onDischarge}
              >
                Discharge
              </Button>
            )}
            <Button
              variant="danger"
              iconName="Trash2"
              onClick={onDelete}
              title="Delete client"
              className="!px-3"
            />
          </div>
        </div>
      </div>

      {/* ─── Demographics ─────────────────────────────────────────────────────── */}
      {hasDemographics && (
        <Section title="Demographics" icon="User">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <LabelValue
              label="Date of Birth"
              value={formatDate(client.dateOfBirth)}
            />
            <LabelValue
              label="Medicaid ID"
              value={client.medicaidMemberId}
            />
            <LabelValue label="Language" value={client.primaryLanguage} />
            <LabelValue
              label="Guardian Status"
              value={client.legalGuardianStatus}
            />
            <LabelValue
              label="Consent on File"
              value={
                client.consentOnFile
                  ? `Yes${client.consentSignedDate ? ` (${formatDate(client.consentSignedDate)})` : ""}`
                  : "No"
              }
            />
            <LabelValue
              label="Advance Directive"
              value={client.advanceDirectiveOnFile ? "Yes" : "No"}
            />
          </dl>
        </Section>
      )}

      {/* ─── Active Services ──────────────────────────────────────────────────── */}
      {activeServices.length > 0 && (
        <Section title="Active Services" icon="Briefcase">
          <div className="space-y-4">
            {activeServices.map(([code, svc]) => {
              const style = SERVICE_BADGE_STYLES[code];
              const borderLeft = style
                ? `border-l-4 ${style.border.replace("border-", "border-l-")}`
                : "";
              return (
                <div
                  key={code}
                  className={`rounded-lg border border-gray-200 p-4 ${borderLeft}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <ServiceBadge code={code} />
                    {svc.authReferenceNumber && (
                      <span className="text-xs text-gray-400">
                        Auth #{svc.authReferenceNumber}
                      </span>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <LabelValue
                      label="Auth Start"
                      value={formatDate(svc.authStartDate)}
                    />
                    <LabelValue
                      label="Auth End"
                      value={formatDate(svc.authEndDate)}
                    />
                    <LabelValue
                      label="Units"
                      value={
                        svc.totalUnitsApproved
                          ? `${svc.unitsUsed || 0} / ${svc.totalUnitsApproved}`
                          : undefined
                      }
                    />
                    <LabelValue
                      label="Initial Assessment"
                      value={formatDate(svc.initialAssessmentDate)}
                    />
                    <LabelValue
                      label="Last Treatment Plan Review"
                      value={formatDate(svc.lastTreatmentPlanReview)}
                    />
                    <LabelValue
                      label="Discharge Plan Date"
                      value={formatDate(svc.dischargePlanDate)}
                    />
                  </dl>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ─── Compliance Alerts ────────────────────────────────────────────────── */}
      {clientAlerts.length > 0 && (
        <Section title="Compliance Alerts" icon="ShieldAlert">
          <div className="space-y-2">
            {clientAlerts.map((alert, idx) => {
              const urgency =
                URGENCY_STYLES[alert.urgency] || URGENCY_STYLES.notice;
              return (
                <div
                  key={alert.id || `${alert.serviceCode}-${idx}`}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${urgency.bg} ${urgency.border}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <LucideIcon
                      name="AlertTriangle"
                      className={`w-4 h-4 flex-shrink-0 ${urgency.text}`}
                    />
                    <span className={`text-sm ${urgency.text}`}>
                      {alert.label}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${urgency.bg} ${urgency.text}`}
                  >
                    {alert.daysUntil <= 0
                      ? `${Math.abs(alert.daysUntil)}d overdue`
                      : `${alert.daysUntil}d remaining`}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ─── Discharge Info ───────────────────────────────────────────────────── */}
      {client.isDischarged && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <LucideIcon name="UserX" className="w-5 h-5 text-orange-600" />
            <h3 className="text-base font-semibold text-orange-800">
              Discharge Information
            </h3>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <dt className="text-xs font-medium text-orange-600">
                Discharge Date
              </dt>
              <dd className="text-sm text-orange-900 mt-0.5">
                {formatDate(client.dischargeDate) || "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-orange-600">Reason</dt>
              <dd className="text-sm text-orange-900 mt-0.5">
                {client.dischargeReason || "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-orange-600">Summary</dt>
              <dd className="text-sm text-orange-900 mt-0.5">
                {client.dischargeSummary || "N/A"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* ─── Treatment Goals ──────────────────────────────────────────────────── */}
      {client.treatmentGoals && client.treatmentGoals.length > 0 && (
        <Section title="Treatment Goals" icon="Target">
          <ol className="list-decimal list-inside space-y-2">
            {client.treatmentGoals.map((goal, idx) => (
              <li key={idx} className="text-sm text-gray-800">
                {typeof goal === "string" ? goal : goal?.text || ""}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* ─── Medical & EPSDT ──────────────────────────────────────────────────── */}
      {hasMedical && (
        <Section title="Medical & EPSDT" icon="Stethoscope">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelValue
              label="Medication Log"
              value={client.medicationLog}
            />
            <LabelValue
              label="Medical Studies / Results"
              value={client.medicalStudiesResults}
            />
            <LabelValue
              label="EPSDT Screenings"
              value={client.epsdtScreenings}
            />
            <LabelValue
              label="EPSDT Education"
              value={client.epsdtEducation}
            />
          </dl>
        </Section>
      )}

      {/* ─── Community Tracking ───────────────────────────────────────────────── */}
      {hasCommunity && (
        <Section title="Community Tracking" icon="Building2">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <LabelValue
              label="Family Involvement"
              value={client.familyInvolvementLog}
            />
            <LabelValue
              label="Care Coordination"
              value={client.careCoordinationLog}
            />
            <LabelValue
              label="Emergency Encounter"
              value={client.emergencyEncounter}
            />
          </dl>
        </Section>
      )}

      {/* ─── Notes ────────────────────────────────────────────────────────────── */}
      {client.notes && (
        <Section title="Notes" icon="StickyNote">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {client.notes}
          </p>
        </Section>
      )}

      {/* ─── QA Audits ───────────────────────────────────────────────────────── */}
      <AuditHistory
        audits={audits || []}
        onViewAudit={onViewAudit}
        onNewAudit={onNewAudit}
        isDischarged={client.isDischarged}
      />

      {/* ─── Case Notes List ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <LucideIcon name="FileText" className="w-5 h-5 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">
              Case Notes ({clientEntries.length})
            </h3>
          </div>
          {!client.isDischarged && (
            <Button
              variant="primary"
              iconName="Plus"
              onClick={onCreateNote}
              className="text-sm"
            >
              New Note
            </Button>
          )}
        </div>

        <div className="p-6">
          {clientEntries.length === 0 ? (
            <div className="text-center py-8">
              <LucideIcon
                name="FileText"
                className="w-10 h-10 text-gray-300 mx-auto mb-3"
              />
              <p className="text-sm text-gray-500 mb-3">
                No case notes yet for this client.
              </p>
              {!client.isDischarged && (
                <Button
                  variant="primary"
                  iconName="Plus"
                  onClick={onCreateNote}
                >
                  Create a note
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {clientEntries.map((entry) => {
                const svc = SERVICE_TYPES[entry.serviceType];
                const badge = SERVICE_BADGE_STYLES[entry.serviceType];
                return (
                  <button
                    key={entry.id}
                    onClick={() => onViewEntry(entry)}
                    className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDate(entry.date)}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {svc && badge && (
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                              >
                                {svc.label}
                              </span>
                            )}
                            {entry.goalWorkedOn && (
                              <span className="text-xs text-gray-500">
                                Goal: {entry.goalWorkedOn}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-500">
                        {entry.currentRatingOfGoal && (
                          <span>Rating: {entry.currentRatingOfGoal}/10</span>
                        )}
                        {entry.providerSignature && (
                          <span className="flex items-center gap-1">
                            <LucideIcon
                              name="CheckCircle"
                              className="w-3 h-3 text-green-500"
                            />
                            Signed
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
    </div>
  );
}
