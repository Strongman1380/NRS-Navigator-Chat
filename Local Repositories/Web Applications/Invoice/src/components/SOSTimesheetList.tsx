import React from 'react';
import { Timesheet } from '../types';
import { newSOSTimesheet } from '../utils/sosStorage';

interface Props {
  timesheets: Timesheet[];
  onSelect: (ts: Timesheet) => void;
  onNew: (ts: Timesheet) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  lastStaffName: string;
}

function formatPayPeriod(start: string, end: string): string {
  if (!start && !end) return 'No dates set';
  return `${start || '?'} – ${end || '?'}`;
}

export function SOSTimesheetList({ timesheets, onSelect, onNew, onDelete, onBack, lastStaffName }: Props) {
  function handleNew() {
    const ts = newSOSTimesheet(lastStaffName);
    onNew(ts);
  }

  return (
    <div className="list-wrap">
      <div className="list-header">
        <div className="list-header-left">
          <button onClick={onBack} className="btn btn-ghost list-back-btn">← Home</button>
          <div>
            <h1 className="list-title">SOS Staff Timesheet</h1>
            <p className="list-subtitle">Service Tracking Manager</p>
          </div>
        </div>
        <button onClick={handleNew} className="btn btn-primary btn-lg">
          + New Timesheet
        </button>
      </div>

      {timesheets.length === 0 ? (
        <div className="list-empty">
          <div className="list-empty-icon">📋</div>
          <p>No saved timesheets yet.</p>
          <p>Click <strong>+ New Timesheet</strong> to get started.</p>
        </div>
      ) : (
        <div className="list-grid">
          {timesheets.map(ts => (
            <div key={ts.id} className="list-card" onClick={() => onSelect(ts)}>
              <div className="list-card-top">
                <div className="list-card-name">{ts.staff_name || 'Unnamed Staff'}</div>
                <button
                  className="list-card-delete"
                  onClick={e => { e.stopPropagation(); if (confirm('Delete this timesheet?')) onDelete(ts.id); }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
              <div className="list-card-week">
                Pay Period: <strong>{formatPayPeriod(ts.pay_period_start, ts.pay_period_end)}</strong>
              </div>
              <div className="list-card-stats">
                <span>{ts.entries.length} entries</span>
                <span>{ts.entries.reduce((sum, e) => sum + (e.hours || 0), 0).toFixed(1)} hrs</span>
                <span>{ts.entries.reduce((sum, e) => sum + (e.mileage || 0), 0).toFixed(1)} mi</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
