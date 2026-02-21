import { useMemo } from "react";

/**
 * Generates alerts for audits that need correction or failed.
 * Returns array of alert objects compatible with the compliance alerts format.
 */
export function useAuditAlerts(audits, clients) {
  return useMemo(() => {
    const alerts = [];
    if (!audits || !clients) return alerts;

    for (const audit of audits) {
      if (audit.isArchived) continue;

      const client = clients.find((c) => c.id === audit.clientId);
      if (!client || client.isArchived || client.isDischarged) continue;

      if (audit.audit_status === "Needs Correction") {
        alerts.push({
          id: `audit_correction_${audit.id}`,
          clientId: audit.clientId,
          clientName: audit.clientName || client.clientName,
          type: "audit_correction",
          label: `QA Audit Needs Correction (${audit.audit_date})`,
          urgency: "warning",
          auditId: audit.id,
        });
      } else if (audit.audit_status === "Failed - Do Not Bill") {
        alerts.push({
          id: `audit_failed_${audit.id}`,
          clientId: audit.clientId,
          clientName: audit.clientName || client.clientName,
          type: "audit_failed",
          label: `QA Audit Failed — Do Not Bill (${audit.audit_date})`,
          urgency: "critical",
          auditId: audit.id,
        });
      }
    }

    return alerts;
  }, [audits, clients]);
}
