import React, { useState } from "react";
import { LucideIcon } from "../../components/LucideIcon";
import { Button } from "../../components/Button";
import { InputField } from "../../components/InputField";
import {
  SERVICE_TYPES,
  SERVICE_CODES,
  SERVICE_BADGE_STYLES,
} from "../../config/constants";

export function ClientList({
  clients,
  entries,
  activeClients,
  onSelectClient,
  onAddClient,
  showArchived,
  setShowArchived,
}) {
  const [clientSearch, setClientSearch] = useState("");

  // Determine the base list: active only or all
  const baseList = showArchived ? clients : activeClients;

  // Apply search filter
  const searchLower = clientSearch.toLowerCase();
  const filteredClients = baseList.filter((c) => {
    if (!clientSearch) return true;
    return (
      (c.clientName || "").toLowerCase().includes(searchLower) ||
      (c.masterCaseNumber || "").toLowerCase().includes(searchLower)
    );
  });

  // Helper: count entries for a client
  const getEntryCount = (clientId) =>
    (entries || []).filter((e) => e.clientId === clientId).length;

  // Helper: get active service codes for a client
  const getActiveServices = (client) =>
    SERVICE_CODES.filter((code) => client.services?.[code]?.active);

  // Helper: get initials
  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "?");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Clients</h2>
        <Button iconName="Plus" onClick={onAddClient}>
          Add Client
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LucideIcon name="Search" className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <span className="text-sm text-gray-600">Show discharged</span>
        </label>
      </div>

      {/* Client Grid */}
      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const activeServices = getActiveServices(client);
            const entryCount = getEntryCount(client.id);
            const goalCount = (client.treatmentGoals || []).length;
            const isInactive = client.isDischarged || client.isArchived;

            return (
              <button
                key={client.id}
                type="button"
                onClick={() => onSelectClient(client)}
                className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-md hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      isInactive ? "bg-gray-400" : "bg-[var(--brand-red)]"
                    }`}
                  >
                    {getInitial(client.clientName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name + Master Case */}
                    <h3 className="font-semibold text-gray-900 truncate">
                      {client.clientName || "Unnamed Client"}
                    </h3>
                    {client.masterCaseNumber && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        MC# {client.masterCaseNumber}
                      </p>
                    )}

                    {/* Service Badges */}
                    {activeServices.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {activeServices.map((code) => {
                          const badge = SERVICE_BADGE_STYLES[code];
                          return (
                            <span
                              key={code}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                            >
                              {code}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Counts + Status */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <LucideIcon name="FileText" className="w-3 h-3" />
                        {entryCount} note{entryCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <LucideIcon name="Target" className="w-3 h-3" />
                        {goalCount} goal{goalCount !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {client.isDischarged && (
                      <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        Discharged
                      </span>
                    )}
                    {client.isArchived && !client.isDischarged && (
                      <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Archived
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <LucideIcon name="Users" className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No clients found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {clientSearch
              ? "Try adjusting your search terms."
              : "Get started by adding your first client."}
          </p>
          {!clientSearch && (
            <Button iconName="Plus" onClick={onAddClient}>
              Add Client
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
