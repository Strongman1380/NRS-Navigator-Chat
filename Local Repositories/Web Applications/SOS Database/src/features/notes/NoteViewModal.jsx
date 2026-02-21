import React from "react";
import { LucideIcon } from "../../components/LucideIcon";
import { Button } from "../../components/Button";
import { SERVICE_TYPES, SERVICE_BADGE_STYLES } from "../../config/constants";
import { formatDate, formatTime12h } from "../../utils/dateHelpers";

const Section = ({ title, content }) =>
  content ? (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-1">{title}</h4>
      <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{content}</p>
    </div>
  ) : null;

const InfoItem = ({ label, value }) =>
  value ? (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800 mt-0.5">{value}</dd>
    </div>
  ) : null;

export function NoteViewModal({ entry, onClose, onEdit, onArchive, onDelete, onPrint, onExportPDF }) {
  if (!entry) return null;

  const serviceLabel = SERVICE_TYPES[entry.serviceType]?.label || entry.serviceType;
  const style = SERVICE_BADGE_STYLES[entry.serviceType] || {};

  const renderCTASections = () => (
    <>
      <Section title="Case Opened" content={entry.caseOpened} />
      <Section title="Treatment Plan Goals" content={entry.treatmentPlanGoals} />
      <Section title="Goals for CTA Provider" content={entry.goalsForCTAProvider} />
      <Section title="Goal Worked On" content={entry.goalWorkedOn} />
      <Section title="Current Rating of Goal" content={entry.currentRatingOfGoal ? `${entry.currentRatingOfGoal}/10` : ""} />
      <Section title="Intervention / Outcomes" content={entry.interventionOutcomes} />
      <Section title="Progress Made" content={entry.progressMade} />
      <Section title="Plan for Next Session" content={entry.planForNextSession} />
      <Section title="Changes to ADL" content={entry.changesToADL} />
      <Section
        title="Additional Services Needed"
        content={
          entry.additionalServicesNeeded === "Yes"
            ? `Yes — ${entry.additionalServicesDescription || "No description provided"}`
            : entry.additionalServicesNeeded
        }
      />
      <Section title="Family Involvement Note" content={entry.familyInvolvementNote} />
    </>
  );

  const renderMHSections = () => (
    <>
      <Section title="Treatment Plan Goals" content={entry.treatmentPlanGoals} />
      <Section title="Therapy Modality" content={entry.therapyModality} />
      <Section title="Clinical Findings" content={entry.clinicalFindings} />
      <Section title="Mental Status Exam" content={entry.mentalStatusExam} />
      <Section title="Diagnostic Impression" content={entry.diagnosticImpression} />
      <Section title="Intervention / Outcomes" content={entry.interventionOutcomes} />
      <Section title="Progress Made" content={entry.progressMade} />
      <Section title="Plan for Next Session" content={entry.planForNextSession} />
    </>
  );

  const renderSASections = () => (
    <>
      <Section title="Treatment Plan Goals" content={entry.treatmentPlanGoals} />
      <Section title="Substance Use Status" content={entry.substanceUseStatus} />
      <Section title="Clinical Findings" content={entry.clinicalFindings} />
      <Section title="Supervision Notes" content={entry.supervisionNotes} />
      <Section title="Intervention / Outcomes" content={entry.interventionOutcomes} />
      <Section title="Progress Made" content={entry.progressMade} />
      <Section title="Plan for Next Session" content={entry.planForNextSession} />
    </>
  );

  const renderCSSections = () => (
    <>
      <Section title="Treatment Plan Goals" content={entry.treatmentPlanGoals} />
      <Section title="Referral Agency" content={entry.referralAgency} />
      <Section title="Referral Outcome" content={entry.referralOutcome} />
      <Section title="Care Coordination Note" content={entry.careCoordinationNote} />
      <Section title="Family Involvement Note" content={entry.familyInvolvementNote} />
      <Section title="Intervention / Outcomes" content={entry.interventionOutcomes} />
      <Section title="Progress Made" content={entry.progressMade} />
      <Section title="Plan for Next Session" content={entry.planForNextSession} />
    </>
  );

  const renderServiceSections = () => {
    switch (entry.serviceType) {
      case "CTA":
        return renderCTASections();
      case "MH":
        return renderMHSections();
      case "SA":
        return renderSASections();
      case "CS":
        return renderCSSections();
      default:
        return (
          <>
            <Section title="Treatment Plan Goals" content={entry.treatmentPlanGoals} />
            <Section title="Intervention / Outcomes" content={entry.interventionOutcomes} />
            <Section title="Progress Made" content={entry.progressMade} />
            <Section title="Plan for Next Session" content={entry.planForNextSession} />
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 flex flex-col max-h-[90vh]">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="text-lg font-bold text-gray-800">
              {serviceLabel} - {entry.clientName}
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
            <Button variant="secondary" iconName="Printer" onClick={onPrint} className="text-sm !px-3 !py-1.5">
              Print
            </Button>
            <Button variant="secondary" iconName="FileDown" onClick={onExportPDF} className="text-sm !px-3 !py-1.5">
              PDF Export
            </Button>
            <Button variant="secondary" iconName="Pencil" onClick={onEdit} className="text-sm !px-3 !py-1.5">
              Edit
            </Button>
            <Button
              variant="secondary"
              iconName={entry.isArchived ? "ArchiveRestore" : "Archive"}
              onClick={onArchive}
              className="text-sm !px-3 !py-1.5"
            >
              {entry.isArchived ? "Restore" : "Archive"}
            </Button>
            <Button variant="danger" iconName="Trash2" onClick={onDelete} className="text-sm !px-3 !py-1.5">
              Delete
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Archived banner */}
          {entry.isArchived && (
            <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
              <LucideIcon name="Archive" className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 font-medium">This note is archived</span>
            </div>
          )}

          {/* Service type badge */}
          <div className="mb-6">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${style.bg} ${style.text} ${style.border}`}
            >
              <LucideIcon name={SERVICE_TYPES[entry.serviceType]?.icon || "FileText"} className="w-4 h-4 mr-1.5" />
              {serviceLabel}
            </span>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 rounded-lg p-4">
            <InfoItem label="Client Name" value={entry.clientName} />
            <InfoItem label="Date" value={formatDate(entry.date)} />
            <InfoItem label="Time Start" value={formatTime12h(entry.timeStart)} />
            <InfoItem label="Time End" value={formatTime12h(entry.timeEnd)} />
            <InfoItem label="Service Location" value={entry.serviceLocation} />
            <InfoItem label="Participants" value={entry.participants} />
            <InfoItem label="Length of Service" value={entry.lengthOfService} />
          </div>

          {/* Telehealth details */}
          {entry.serviceLocation === "Telehealth" && entry.telehealthDetails && (
            <div className="mb-6">
              <Section title="Telehealth Details" content={entry.telehealthDetails} />
            </div>
          )}

          {/* Service-specific sections */}
          <div className="mb-6">{renderServiceSections()}</div>

          {/* Signature section */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Signature</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-800 mb-1">{entry.providerSignature || "—"}</p>
                <div className="border-t border-gray-400 pt-1">
                  <span className="text-xs text-gray-500">Provider Signature</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-800 mb-1">{formatDate(entry.signatureDate) || "—"}</p>
                <div className="border-t border-gray-400 pt-1">
                  <span className="text-xs text-gray-500">Date</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
