import React from 'react';
import { HBHTimesheet } from '../types/hbh';
import { newTimesheet, deleteTimesheet } from '../utils/hbhStorage';

interface Props {
  timesheets: HBHTimesheet[];
  onSelect: (ts: HBHTimesheet) => void;
  onNew: (ts: HBHTimesheet) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  lastEmployeeName: string;
}

function formatWeekEnding(dateStr: string): string {
  if (!dateStr) return 'No date set';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatSaved(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function TimesheetList({ timesheets, onSelect, onNew, onDelete, onBack, lastEmployeeName }: Props) {
  function handleNew() {
    const ts = newTimesheet(lastEmployeeName);
    onNew(ts);
  }

  return (
    <div className="list-wrap">
      <div className="list-header">
        <div className="list-header-left">
          <button onClick={onBack} className="btn btn-ghost list-back-btn">← Home</button>
          <div>
            <h1 className="list-title">Heartland Boys Home</h1>
            <p className="list-subtitle">Time Card Manager</p>
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
                <div className="list-card-name">{ts.employeeName || 'Unnamed Employee'}</div>
                <button
                  className="list-card-delete"
                  onClick={e => { e.stopPropagation(); if (confirm('Delete this timesheet?')) onDelete(ts.id); }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
              <div className="list-card-week">
                Week Ending: <strong>{formatWeekEnding(ts.weekEndingDate)}</strong>
              </div>
              <div className="list-card-saved">Saved: {formatSaved(ts.savedAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
