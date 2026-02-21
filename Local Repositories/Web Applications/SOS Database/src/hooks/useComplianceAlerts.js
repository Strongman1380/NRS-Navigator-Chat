import { useMemo } from "react";
import { COMPLIANCE_RULES, CONSENT_RENEWAL_DAYS, getUrgency } from "../config/complianceRules";
import { SERVICE_TYPES } from "../config/constants";
import { parseDate, addDays, diffDays } from "../utils/dateHelpers";

export function useComplianceAlerts(clients) {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alerts = [];

    (clients || [])
      .filter((c) => !c.isArchived && !c.isDischarged)
      .forEach((client) => {
        // Consent renewal
        if (client.consentSignedDate) {
          const dueDate = addDays(parseDate(client.consentSignedDate), CONSENT_RENEWAL_DAYS);
          const daysUntil = diffDays(today, dueDate);
          if (daysUntil <= 30) {
            alerts.push({
              id: `${client.id}_consent`,
              clientId: client.id,
              clientName: client.clientName,
              type: "consent_renewal",
              label: "Consent Form Renewal",
              dueDate,
              daysUntil,
              urgency: getUrgency(daysUntil),
            });
          }
        }

        // Per-service alerts
        Object.entries(client.services || {}).forEach(([code, svc]) => {
          if (!svc.active) return;
          const rules = COMPLIANCE_RULES[code];
          if (!rules) return;
          const svcLabel = SERVICE_TYPES[code]?.label || code;

          // Auth expiration
          if (svc.authEndDate) {
            const dueDate = parseDate(svc.authEndDate);
            const daysUntil = diffDays(today, dueDate);
            if (daysUntil <= 30) {
              alerts.push({
                id: `${client.id}_${code}_auth`,
                clientId: client.id,
                clientName: client.clientName,
                serviceCode: code,
                type: "auth_expiration",
                label: `${svcLabel} — Auth Expiration`,
                dueDate,
                daysUntil,
                urgency: getUrgency(daysUntil),
              });
            }
          }

          // Service end date
          if (svc.serviceEndDate) {
            const dueDate = parseDate(svc.serviceEndDate);
            const daysUntil = diffDays(today, dueDate);
            if (daysUntil <= 30) {
              alerts.push({
                id: `${client.id}_${code}_svcend`,
                clientId: client.id,
                clientName: client.clientName,
                serviceCode: code,
                type: "service_end",
                label: `${svcLabel} — Service End Date`,
                dueDate,
                daysUntil,
                urgency: getUrgency(daysUntil),
              });
            }
          }

          // Treatment plan review
          const tprBase = svc.lastTreatmentPlanReview || svc.serviceStartDate;
          if (tprBase) {
            const dueDate = addDays(parseDate(tprBase), rules.treatmentPlanReviewDays);
            const daysUntil = diffDays(today, dueDate);
            if (daysUntil <= 30) {
              alerts.push({
                id: `${client.id}_${code}_tpr`,
                clientId: client.id,
                clientName: client.clientName,
                serviceCode: code,
                type: "treatment_plan_review",
                label: `${svcLabel} — Treatment Plan Review`,
                dueDate,
                daysUntil,
                urgency: getUrgency(daysUntil),
              });
            }
          }

          // Initial assessment (only if not yet completed)
          if (!svc.initialAssessmentDate && svc.serviceStartDate) {
            const dueDate = addDays(parseDate(svc.serviceStartDate), rules.initialAssessmentDays);
            const daysUntil = diffDays(today, dueDate);
            if (daysUntil <= 30) {
              alerts.push({
                id: `${client.id}_${code}_init`,
                clientId: client.id,
                clientName: client.clientName,
                serviceCode: code,
                type: "initial_assessment",
                label: `${svcLabel} — Initial Assessment Due`,
                dueDate,
                daysUntil,
                urgency: getUrgency(daysUntil),
              });
            }
          }

          // Units running out (>80%)
          if (svc.totalUnitsApproved && svc.unitsUsed) {
            const total = parseInt(svc.totalUnitsApproved, 10);
            const used = parseInt(svc.unitsUsed, 10);
            if (total > 0 && used / total >= 0.8) {
              const pct = Math.round((used / total) * 100);
              alerts.push({
                id: `${client.id}_${code}_units`,
                clientId: client.id,
                clientName: client.clientName,
                serviceCode: code,
                type: "units_running_out",
                label: `${svcLabel} — ${pct}% Units Used (${used}/${total})`,
                daysUntil: pct >= 100 ? -1 : 15,
                urgency: pct >= 100 ? "overdue" : pct >= 90 ? "critical" : "warning",
              });
            }
          }
        });
      });

    return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [clients]);
}
