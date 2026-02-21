import React, { useState, useMemo } from "react";
import { LucideIcon } from "../../components/LucideIcon";
import { Button } from "../../components/Button";
import { InputField } from "../../components/InputField";
import { SERVICE_TYPES, SERVICE_BADGE_STYLES, SERVICE_CODES } from "../../config/constants";
import { formatDate } from "../../utils/dateHelpers";

export function NoteHistory({ entries, clients, activeClients, onViewEntry, onSwitchToForm }) {
  const [filterClient, setFilterClient] = useState("");
  const [filterServiceType, setFilterServiceType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const hasActiveFilters = filterClient || filterServiceType || filterDateFrom || filterDateTo || showArchived;

  const clearFilters = () => {
    setFilterClient("");
    setFilterServiceType("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setShowArchived(false);
  };

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Sort by date descending
    result.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    // Filter archived
    if (!showArchived) {
      result = result.filter((e) => !e.isArchived);
    }

    // Filter by client
    if (filterClient) {
      result = result.filter((e) => e.clientId === filterClient);
    }

    // Filter by service type
    if (filterServiceType) {
      result = result.filter((e) => e.serviceType === filterServiceType);
    }

    // Filter by date range
    if (filterDateFrom) {
      result = result.filter((e) => e.date >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((e) => e.date <= filterDateTo);
    }

    return result;
  }, [entries, filterClient, filterServiceType, filterDateFrom, filterDateTo, showArchived]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <h2 className="text-xl font-bold text-gray-800">Note History</h2>

      {/* Filters card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        {/* Client filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white cursor-pointer"
          >
            <option value="">All Clients</option>
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientName}
              </option>
            ))}
          </select>
        </div>

        {/* Service type pill badges */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterServiceType("")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                filterServiceType === ""
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {SERVICE_CODES.map((code) => {
              const style = SERVICE_BADGE_STYLES[code];
              const isActive = filterServiceType === code;
              return (
                <button
                  key={code}
                  onClick={() => setFilterServiceType(isActive ? "" : code)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                    isActive
                      ? `${style.bg} ${style.text} ${style.border} ring-2 ring-offset-1 ring-current`
                      : `${style.bg} ${style.text} ${style.border} opacity-60 hover:opacity-100`
                  }`}
                >
                  {SERVICE_TYPES[code].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Date From"
            type="date"
            value={filterDateFrom}
            onChange={setFilterDateFrom}
          />
          <InputField
            label="Date To"
            type="date"
            value={filterDateTo}
            onChange={setFilterDateTo}
          />
        </div>

        {/* Show archived checkbox */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-gray-300 text-[var(--brand-red)] focus:ring-[var(--brand-red)]"
            />
            <span className="text-sm text-gray-600">Show archived notes</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-[var(--brand-red)] hover:underline font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 font-medium">
        {filteredEntries.length} note{filteredEntries.length !== 1 ? "s" : ""}
      </p>

      {/* Entry list */}
      {filteredEntries.length > 0 ? (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const style = SERVICE_BADGE_STYLES[entry.serviceType] || {};
            const serviceLabel = SERVICE_TYPES[entry.serviceType]?.label || entry.serviceType;
            return (
              <div
                key={entry.id}
                onClick={() => onViewEntry(entry)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${style.bg || "bg-gray-100"}`}>
                    <LucideIcon name="FileText" className={`w-5 h-5 ${style.text || "text-gray-500"}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      {/* Service type badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}
                      >
                        {serviceLabel}
                      </span>

                      {/* Archived badge */}
                      {entry.isArchived && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                          Archived
                        </span>
                      )}

                      {/* Additional services badge */}
                      {entry.additionalServicesNeeded === "Yes" && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                          Add'l Services
                        </span>
                      )}
                    </div>

                    {/* Client name and date */}
                    <p className="text-sm font-semibold text-gray-800">
                      {entry.clientName}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span>{formatDate(entry.date)}</span>
                      {entry.goalWorkedOn && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>Goal: {entry.goalWorkedOn}</span>
                        </>
                      )}
                      {entry.currentRatingOfGoal && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>Rating: {entry.currentRatingOfGoal}/10</span>
                        </>
                      )}
                    </div>

                    {/* Truncated intervention/outcomes preview */}
                    {entry.interventionOutcomes && (
                      <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">
                        {entry.interventionOutcomes}
                      </p>
                    )}
                  </div>

                  {/* Chevron */}
                  <LucideIcon name="ChevronRight" className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <LucideIcon name="FileText" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium mb-1">No case notes found</p>
          <p className="text-sm text-gray-400 mb-4">
            {hasActiveFilters
              ? "Try adjusting your filters to find notes."
              : "Get started by creating your first case note."}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={onSwitchToForm}
              className="text-sm text-[var(--brand-red)] hover:underline font-medium"
            >
              Create your first note
            </button>
          )}
        </div>
      )}
    </div>
  );
}
