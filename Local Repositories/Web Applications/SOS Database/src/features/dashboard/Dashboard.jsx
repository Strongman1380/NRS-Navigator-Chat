import React, { useState, useMemo } from "react";
import { LucideIcon } from "../../components/LucideIcon";
import { Button } from "../../components/Button";
import { SERVICE_TYPES, SERVICE_BADGE_STYLES } from "../../config/constants";
import { URGENCY_STYLES } from "../../config/complianceRules";
import { formatDate } from "../../utils/dateHelpers";

// ─── Urgency sort order (most urgent first) ─────────────────────────────────
const URGENCY_ORDER = { overdue: 0, critical: 1, warning: 2, notice: 3 };

// ─── Group labels for alert sections ─────────────────────────────────────────
const GROUP_LABELS = {
  overdue: "Overdue",
  critical: "Due Soon",
  warning: "Due Soon",
  notice: "Upcoming",
};

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          accent ? "bg-red-50" : "bg-gray-50"
        }`}
      >
        <LucideIcon
          name={icon}
          className={`w-6 h-6 ${accent ? "text-red-600" : "text-gray-500"}`}
        />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p
          className={`text-2xl font-bold ${
            accent ? "text-red-600" : "text-gray-900"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function AlertRow({ alert, onSelect }) {
  const urgency = URGENCY_STYLES[alert.urgency] || URGENCY_STYLES.notice;
  const service = SERVICE_TYPES[alert.serviceCode];
  const badge = SERVICE_BADGE_STYLES[alert.serviceCode];

  // Left border color based on urgency
  const borderColor =
    alert.urgency === "overdue" || alert.urgency === "critical"
      ? "border-l-red-500"
      : alert.urgency === "warning"
      ? "border-l-orange-400"
      : "border-l-yellow-400";

  return (
    <button
      onClick={() => onSelect(alert.clientId)}
      className={`w-full text-left ${urgency.bg} border ${urgency.border} border-l-4 ${borderColor} rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {alert.clientName}
            </p>
            <p className={`text-xs mt-0.5 ${urgency.text}`}>
              {alert.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {service && badge && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} border ${badge.border}`}
            >
              {service.code}
            </span>
          )}
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${urgency.bg} ${urgency.text}`}
          >
            {alert.daysUntil <= 0
              ? `${Math.abs(alert.daysUntil)}d overdue`
              : `${alert.daysUntil}d remaining`}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function Dashboard({
  clients,
  entries,
  alerts,
  audits,
  securityMetrics,
  onSelectClient,
  onSwitchTab,
}) {
  // ─── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeClients = (clients || []).filter(
      (c) => !c.isArchived && !c.isDischarged
    );

    const activeServices = activeClients.reduce((count, client) => {
      if (!client.services) return count;
      return (
        count +
        Object.values(client.services).filter((s) => s.active).length
      );
    }, 0);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const notesThisMonth = (entries || []).filter((e) => {
      if (!e.date) return false;
      const [y, m] = e.date.split("-").map(Number);
      return y === currentYear && m - 1 === currentMonth;
    }).length;

    const alertCount = (alerts || []).length;
    const hasUrgent = (alerts || []).some(
      (a) => a.urgency === "overdue" || a.urgency === "critical"
    );

    // Audit stats
    const auditsThisMonth = (audits || []).filter((a) => {
      if (!a.audit_date) return false;
      const [y, m] = a.audit_date.split("-").map(Number);
      return y === currentYear && m - 1 === currentMonth;
    }).length;
    const correctionsPending = (audits || []).filter(
      (a) => a.audit_status === "Needs Correction"
    ).length;
    const failedAudits = (audits || []).filter(
      (a) => a.audit_status === "Failed - Do Not Bill"
    ).length;

    return {
      activeClients: activeClients.length,
      activeServices,
      notesThisMonth,
      alertCount,
      hasUrgent,
      auditsThisMonth,
      correctionsPending,
      failedAudits,
    };
  }, [clients, entries, alerts, audits]);

  // ─── Sorted & grouped alerts ─────────────────────────────────────────────────
  const sortedAlerts = useMemo(() => {
    return [...(alerts || [])].sort(
      (a, b) =>
        (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9)
    );
  }, [alerts]);

  const groupedAlerts = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    sortedAlerts.forEach((alert) => {
      const groupLabel = GROUP_LABELS[alert.urgency] || "Other";
      if (!currentGroup || currentGroup.label !== groupLabel) {
        currentGroup = { label: groupLabel, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(alert);
    });

    return groups;
  }, [sortedAlerts]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          SOS Counseling, LLC — Case Notes Overview
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="Users"
          label="Active Clients"
          value={stats.activeClients}
        />
        <StatCard
          icon="Briefcase"
          label="Active Services"
          value={stats.activeServices}
        />
        <StatCard
          icon="FileText"
          label="Notes This Month"
          value={stats.notesThisMonth}
        />
        <StatCard
          icon="AlertTriangle"
          label="Alerts"
          value={stats.alertCount}
          accent={stats.hasUrgent}
        />
      </div>

      {/* Audit Stats Row */}
      {(stats.auditsThisMonth > 0 || stats.correctionsPending > 0 || stats.failedAudits > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon="ClipboardCheck"
            label="Audits This Month"
            value={stats.auditsThisMonth}
          />
          <StatCard
            icon="AlertOctagon"
            label="Corrections Pending"
            value={stats.correctionsPending}
            accent={stats.correctionsPending > 0}
          />
          <StatCard
            icon="Ban"
            label="Failed Audits"
            value={stats.failedAudits}
            accent={stats.failedAudits > 0}
          />
        </div>
      )}

      {securityMetrics && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <LucideIcon name="ShieldCheck" className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Security Monitoring</h2>
            </div>
            <span className="text-xs text-gray-500">Last {securityMetrics.windowHours || 24} hours</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="Activity" label="Security Events" value={securityMetrics.totalEvents || 0} />
              <StatCard icon="ShieldAlert" label="Denied Requests" value={securityMetrics.deniedEvents || 0} accent={(securityMetrics.deniedEvents || 0) > 0} />
              <StatCard icon="FileOutput" label="Print/PDF Exports" value={securityMetrics.exportEvents || 0} />
              <StatCard icon="KeyRound" label="Session Revocations" value={securityMetrics.revokeEvents || 0} accent={(securityMetrics.revokeEvents || 0) > 0} />
            </div>

            {Array.isArray(securityMetrics.alerts) && securityMetrics.alerts.length > 0 ? (
              <div className="space-y-2">
                {securityMetrics.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      alert.severity === "high"
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}
                  >
                    {alert.label}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                No security anomalies detected in the current monitoring window.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compliance Alerts Panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <LucideIcon name="ShieldAlert" className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Compliance Alerts
            </h2>
            {stats.alertCount > 0 && (
              <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {stats.alertCount}
              </span>
            )}
          </div>
        </div>

        {/* Alert Content */}
        <div className="p-6">
          {sortedAlerts.length === 0 ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <LucideIcon
                name="CheckCircle"
                className="w-5 h-5 text-green-600"
              />
              <div>
                <p className="text-sm font-semibold text-green-800">
                  All Clear
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  No compliance alerts at this time. All deadlines are on track.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedAlerts.map((group) => (
                <div key={group.label}>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    {group.label}
                  </h3>
                  <div className="space-y-2">
                    {group.items.map((alert, idx) => (
                      <AlertRow
                        key={alert.id || `${alert.clientId}-${alert.serviceCode}-${idx}`}
                        alert={alert}
                        onSelect={onSelectClient}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
