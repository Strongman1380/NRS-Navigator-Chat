import { formatDate, formatTime12h } from "./dateHelpers";
import { SERVICE_TYPES } from "../config/constants";

// ─── Service-specific report titles ─────────────────────────────────────────
const REPORT_TITLES = {
  CTA: "Daily Progress Report",
  MH: "Mental Health Session Note",
  SA: "Substance Abuse Progress Note",
  CS: "Community Support Note",
};

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"'`]/g, (char) => HTML_ESCAPE_MAP[char]);
}

function sanitizeFilenamePart(value, fallback) {
  const sanitized = String(value ?? "")
    .trim()
    .replace(/[^\w.-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return sanitized || fallback;
}

function sanitizeDataUrl(value) {
  if (typeof value !== "string") return "";
  if (!value.startsWith("data:image/")) return "";
  return value;
}

// ─── Build filename: lastname.firstname.MasterCase.ServiceType.MMYYYY ───────
function buildFilename(entry) {
  const nameParts = (entry.clientName || "Client").trim().split(/\s+/);
  const lastName = sanitizeFilenamePart(
    nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0],
    "Client"
  );
  const firstName = sanitizeFilenamePart(nameParts.length > 1 ? nameParts[0] : "", "Unknown");
  const dateObj = entry.date ? new Date(entry.date + "T00:00:00") : new Date();
  const monthYear = String(dateObj.getMonth() + 1).padStart(2, "0") + dateObj.getFullYear();
  const mc = sanitizeFilenamePart(entry.masterCaseNumber || "NoCase", "NoCase");
  const svc = sanitizeFilenamePart(entry.serviceType || "CTA", "CTA");
  return `${lastName}.${firstName}.${mc}.${svc}.${monthYear}`;
}

// ─── Build section HTML helper ──────────────────────────────────────────────
function section(title, content) {
  if (!content) return "";
  return `<div style="margin-bottom: 14px;">
    <h3 style="color: #8B1A1A; font-size: 13px; margin: 0 0 6px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">${escapeHtml(title)}</h3>
    <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(content)}</p>
  </div>`;
}

function infoRow(label, value) {
  if (!value) return "";
  return `<tr><td style="padding: 4px 8px; font-weight: 600; width: 180px; color: #374151;">${escapeHtml(label)}:</td><td style="padding: 4px 8px;">${escapeHtml(value)}</td></tr>`;
}

// ─── Build service-specific content ─────────────────────────────────────────
function buildServiceFields(entry) {
  const type = entry.serviceType || "CTA";
  let html = "";

  // Common sections
  html += section("Treatment Plan Goals", entry.treatmentPlanGoals);

  if (type === "CTA") {
    html += section("Goals for CTA Provider in Working with the Client", entry.goalsForCTAProvider);
    html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      ${infoRow("Goal Worked On", entry.goalWorkedOn)}
      ${infoRow("Current Rating of Goal", entry.currentRatingOfGoal ? `${entry.currentRatingOfGoal} / 10` : "")}
    </table>`;
    html += section("Intervention/Outcomes", entry.interventionOutcomes);
    html += section("Progress Made", entry.progressMade);
    html += section("Plan for Next Session", entry.planForNextSession);
    html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      ${infoRow("Changes to ADL", entry.changesToADL || "No")}
      ${infoRow("Additional Services Needed", entry.additionalServicesNeeded || "No")}
    </table>`;
    if (entry.additionalServicesNeeded === "Yes" && entry.additionalServicesDescription) {
      html += `<div style="margin-bottom: 14px; background: #fffbeb; border: 1px solid #fde68a; padding: 10px; border-radius: 6px;">
        <h3 style="color: #92400e; font-size: 13px; margin: 0 0 6px 0;">If yes, please describe</h3>
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(entry.additionalServicesDescription)}</p>
      </div>`;
    }
    html += section("Family Involvement", entry.familyInvolvementNote);
  }

  if (type === "MH") {
    html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      ${infoRow("Therapy Modality", entry.therapyModality)}
    </table>`;
    html += section("Clinical Findings", entry.clinicalFindings);
    html += section("Mental Status Exam", entry.mentalStatusExam);
    html += section("Diagnostic Impression", entry.diagnosticImpression);
    html += section("Intervention/Outcomes", entry.interventionOutcomes);
    html += section("Progress Made", entry.progressMade);
    html += section("Plan for Next Session", entry.planForNextSession);
  }

  if (type === "SA") {
    html += section("Substance Use Status", entry.substanceUseStatus);
    html += section("Clinical Findings", entry.clinicalFindings);
    html += section("Supervision Notes", entry.supervisionNotes);
    html += section("Intervention/Outcomes", entry.interventionOutcomes);
    html += section("Progress Made", entry.progressMade);
    html += section("Plan for Next Session", entry.planForNextSession);
  }

  if (type === "CS") {
    html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      ${infoRow("Referral Agency", entry.referralAgency)}
      ${infoRow("Referral Outcome", entry.referralOutcome)}
    </table>`;
    html += section("Care Coordination", entry.careCoordinationNote);
    html += section("Family Involvement", entry.familyInvolvementNote);
    html += section("Intervention/Outcomes", entry.interventionOutcomes);
    html += section("Progress Made", entry.progressMade);
    html += section("Plan for Next Session", entry.planForNextSession);
  }

  return html;
}

// ─── Export PDF ──────────────────────────────────────────────────────────────
export async function handleExportPDF(entry, showToast) {
  try {
    const html2pdf = (await import("html2pdf.js")).default;
    const svcType = entry.serviceType || "CTA";
    const reportTitle = REPORT_TITLES[svcType] || "Progress Note";
    const safe = (value) => escapeHtml(value);
    const safeReportTitle = safe(reportTitle);
    const safeServiceLabel = safe(SERVICE_TYPES[svcType]?.label || svcType);
    const safeTime =
      `${formatTime12h(entry.timeStart) || formatTime12h(entry.time) || ""}` +
      `${entry.timeEnd ? ` – ${formatTime12h(entry.timeEnd)}` : ""}`;
    const safeGeneratedDate = safe(new Date().toLocaleDateString());

    // Load logo as base64
    let logoDataUrl = "";
    try {
      const resp = await fetch("/logo.png");
      const blob = await resp.blob();
      logoDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (e) { /* logo optional */ }
    const safeLogoDataUrl = sanitizeDataUrl(logoDataUrl);

    const content = document.createElement("div");
    content.style.padding = "30px";
    content.style.fontFamily = "Inter, Arial, sans-serif";
    content.style.fontSize = "11px";
    content.style.lineHeight = "1.6";
    content.style.color = "#1e293b";

    content.innerHTML = `
      <div style="text-align: center; border-bottom: 3px solid #8B1A1A; padding-bottom: 15px; margin-bottom: 20px;">
        ${safeLogoDataUrl ? `<img src="${safeLogoDataUrl}" style="width: 120px; height: auto; margin: 0 auto 8px auto; display: block;" />` : ""}
        <h1 style="color: #8B1A1A; font-size: 18px; margin: 0 0 2px 0; font-weight: bold;">SOS COUNSELING, LLC</h1>
        <p style="color: #666; font-size: 10px; margin: 0;">1811 West Second Street, Suite 450</p>
        <p style="color: #666; font-size: 10px; margin: 0 0 8px 0;">Grand Island, NE 68801</p>
        <p style="font-size: 14px; font-weight: 600; margin: 0; text-transform: uppercase; letter-spacing: 1px; color: #374151;">${safeReportTitle}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <td style="padding: 4px 8px; font-weight: 600; width: 140px; color: #374151;">Client Name:</td>
          <td style="padding: 4px 8px;">${safe(entry.clientName)}</td>
          <td style="padding: 4px 8px; font-weight: 600; width: 140px; color: #374151;">Service Type:</td>
          <td style="padding: 4px 8px;">${safeServiceLabel}</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px; font-weight: 600; color: #374151;">Date:</td>
          <td style="padding: 4px 8px;">${safe(formatDate(entry.date))}</td>
          <td style="padding: 4px 8px; font-weight: 600; color: #374151;">Time:</td>
          <td style="padding: 4px 8px;">${safe(safeTime)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px; font-weight: 600; color: #374151;">Location:</td>
          <td style="padding: 4px 8px;">${safe(entry.serviceLocation)}</td>
          <td style="padding: 4px 8px; font-weight: 600; color: #374151;">Participants:</td>
          <td style="padding: 4px 8px;">${safe(entry.participants)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px; font-weight: 600; color: #374151;">Length of Service:</td>
          <td style="padding: 4px 8px;">${safe(entry.lengthOfService)}</td>
          ${svcType === "CTA" ? `<td style="padding: 4px 8px; font-weight: 600; color: #374151;">Case Opened:</td><td style="padding: 4px 8px;">${safe(formatDate(entry.caseOpened))}</td>` : "<td></td><td></td>"}
        </tr>
      </table>

      ${entry.telehealthDetails ? section("Telehealth Details", entry.telehealthDetails) : ""}
      ${buildServiceFields(entry)}

      <div style="margin-top: 30px; border-top: 2px solid #374151; padding-top: 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 8px; font-weight: 600; width: 140px; color: #374151;">Signature:</td>
            <td style="padding: 4px 8px; border-bottom: 1px solid #d1d5db;">${safe(entry.providerSignature || entry.signatureOfCTA)}</td>
            <td style="padding: 4px 8px; font-weight: 600; width: 60px; color: #374151;">Date:</td>
            <td style="padding: 4px 8px; border-bottom: 1px solid #d1d5db; width: 120px;">${safe(formatDate(entry.signatureDate))}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; color: #9ca3af; font-size: 9px;">
        Generated ${safeGeneratedDate} &bull; S.O.S. Counseling, LLC &bull; Confidential
      </div>
    `;

    const filename = buildFilename(entry);

    await html2pdf()
      .set({
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${filename}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      })
      .from(content)
      .save();

    if (showToast) showToast("PDF exported");
  } catch (err) {
    console.error("PDF export error:", err);
    if (showToast) showToast("PDF export failed", "error");
  }
}

// ─── Print Entry ────────────────────────────────────────────────────────────
export function handlePrintEntry(entry, showToast) {
  const svcType = entry.serviceType || "CTA";
  const reportTitle = REPORT_TITLES[svcType] || "Progress Note";
  const safe = (value) => escapeHtml(value);
  const safeReportTitle = safe(reportTitle);
  const safeServiceLabel = safe(SERVICE_TYPES[svcType]?.label || svcType);
  const safeTime =
    `${formatTime12h(entry.timeStart) || formatTime12h(entry.time) || ""}` +
    `${entry.timeEnd ? ` – ${formatTime12h(entry.timeEnd)}` : ""}`;

  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    if (showToast) showToast("Pop-up blocked — please allow pop-ups", "error");
    return;
  }
  printWindow.opener = null;

  const html = `<!DOCTYPE html>
<html><head><title>${safeReportTitle} - ${safe(entry.clientName || "Client")}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.5; color: #1e293b; padding: 0.5in; }
  .header { text-align: center; border-bottom: 3px solid #8B1A1A; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { color: #8B1A1A; font-size: 16px; margin-bottom: 2px; }
  .header .subtitle { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #374151; margin-top: 8px; }
  .header .address { color: #666; font-size: 9px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 14px; }
  .info-grid .label { font-weight: 600; color: #374151; }
  .section { margin-bottom: 12px; }
  .section h3 { color: #8B1A1A; font-size: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 6px; }
  .section p { white-space: pre-wrap; }
  .sig-section { margin-top: 24px; border-top: 2px solid #374151; padding-top: 10px; display: grid; grid-template-columns: 1fr auto; gap: 24px; }
  .sig-section .label { font-weight: 600; color: #374151; }
  .footer { margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 8px; color: #9ca3af; font-size: 8px; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="header">
  <h1>SOS COUNSELING, LLC</h1>
  <p class="address">1811 West Second Street, Suite 450</p>
  <p class="address">Grand Island, NE 68801</p>
  <p class="subtitle">${safeReportTitle}</p>
</div>
<div class="info-grid">
  <div><span class="label">Client Name:</span> ${safe(entry.clientName)}</div>
  <div><span class="label">Service:</span> ${safeServiceLabel}</div>
  <div><span class="label">Date:</span> ${safe(formatDate(entry.date))}</div>
  <div><span class="label">Time:</span> ${safe(safeTime)}</div>
  <div><span class="label">Location:</span> ${safe(entry.serviceLocation)}</div>
  <div><span class="label">Participants:</span> ${safe(entry.participants)}</div>
  <div><span class="label">Length of Service:</span> ${safe(entry.lengthOfService)}</div>
  ${svcType === "CTA" ? `<div><span class="label">Case Opened:</span> ${safe(formatDate(entry.caseOpened))}</div>` : ""}
</div>
${entry.telehealthDetails ? `<div class="section"><h3>Telehealth Details</h3><p>${safe(entry.telehealthDetails)}</p></div>` : ""}
${entry.treatmentPlanGoals ? `<div class="section"><h3>Treatment Plan Goals</h3><p>${safe(entry.treatmentPlanGoals)}</p></div>` : ""}
${svcType === "CTA" && entry.goalsForCTAProvider ? `<div class="section"><h3>Goals for CTA Provider</h3><p>${safe(entry.goalsForCTAProvider)}</p></div>` : ""}
${svcType === "CTA" ? `<div class="info-grid"><div><span class="label">Goal Worked On:</span> ${safe(entry.goalWorkedOn)}</div><div><span class="label">Current Rating:</span> ${safe(entry.currentRatingOfGoal ? `${entry.currentRatingOfGoal}/10` : "")}</div></div>` : ""}
${svcType === "MH" && entry.therapyModality ? `<div class="info-grid"><div><span class="label">Therapy Modality:</span> ${safe(entry.therapyModality)}</div></div>` : ""}
${entry.clinicalFindings ? `<div class="section"><h3>Clinical Findings</h3><p>${safe(entry.clinicalFindings)}</p></div>` : ""}
${entry.mentalStatusExam ? `<div class="section"><h3>Mental Status Exam</h3><p>${safe(entry.mentalStatusExam)}</p></div>` : ""}
${entry.diagnosticImpression ? `<div class="section"><h3>Diagnostic Impression</h3><p>${safe(entry.diagnosticImpression)}</p></div>` : ""}
${entry.substanceUseStatus ? `<div class="section"><h3>Substance Use Status</h3><p>${safe(entry.substanceUseStatus)}</p></div>` : ""}
${entry.supervisionNotes ? `<div class="section"><h3>Supervision Notes</h3><p>${safe(entry.supervisionNotes)}</p></div>` : ""}
${entry.referralAgency ? `<div class="info-grid"><div><span class="label">Referral Agency:</span> ${safe(entry.referralAgency)}</div><div><span class="label">Referral Outcome:</span> ${safe(entry.referralOutcome)}</div></div>` : ""}
${entry.careCoordinationNote ? `<div class="section"><h3>Care Coordination</h3><p>${safe(entry.careCoordinationNote)}</p></div>` : ""}
${entry.familyInvolvementNote ? `<div class="section"><h3>Family Involvement</h3><p>${safe(entry.familyInvolvementNote)}</p></div>` : ""}
${entry.interventionOutcomes ? `<div class="section"><h3>Intervention/Outcomes</h3><p>${safe(entry.interventionOutcomes)}</p></div>` : ""}
${entry.progressMade ? `<div class="section"><h3>Progress Made</h3><p>${safe(entry.progressMade)}</p></div>` : ""}
${entry.planForNextSession ? `<div class="section"><h3>Plan for Next Session</h3><p>${safe(entry.planForNextSession)}</p></div>` : ""}
${svcType === "CTA" ? `<div class="info-grid"><div><span class="label">Changes to ADL:</span> ${safe(entry.changesToADL || "No")}</div><div><span class="label">Additional Services:</span> ${safe(entry.additionalServicesNeeded || "No")}</div></div>` : ""}
${entry.additionalServicesNeeded === "Yes" && entry.additionalServicesDescription ? `<div class="section" style="background:#fffbeb;border:1px solid #fde68a;padding:8px;border-radius:4px;"><h3 style="color:#92400e;">Additional Services Description</h3><p>${safe(entry.additionalServicesDescription)}</p></div>` : ""}
<div class="sig-section">
  <div><span class="label">Signature:</span> ${safe(entry.providerSignature || entry.signatureOfCTA)}</div>
  <div><span class="label">Date:</span> ${safe(formatDate(entry.signatureDate))}</div>
</div>
<div class="footer">Generated ${safe(new Date().toLocaleDateString())} &bull; S.O.S. Counseling, LLC &bull; Confidential</div>
</body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => { printWindow.print(); };
}
