import React, { useRef } from 'react';
import { Timesheet } from '../types';
import { TimesheetGrid } from './TimesheetGrid';

interface Props {
  ts: Timesheet;
  onChange: (ts: Timesheet) => void;
  onSave: () => void;
  onBack: () => void;
}

export function SOSTimesheetEditor({ ts, onChange, onSave, onBack }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  const totalHours = ts.entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const totalMileage = ts.entries.reduce((sum, e) => sum + (e.mileage || 0), 0);
  const mileageCost = totalMileage * 0.67;

  return (
    <div className="sos-editor">
      {/* Toolbar */}
      <div className="hbh-toolbar no-print">
        <button onClick={onBack} className="btn btn-ghost">← Saved Timesheets</button>
        <div className="hbh-toolbar-right">
          <button onClick={onSave} className="btn btn-primary">Save</button>
          <button onClick={handlePrint} className="btn btn-secondary">Print / Export</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="sos-card" ref={printRef}>
        {/* Header */}
        <div className="sos-header">
          <div className="sos-header-left">
            <div className="sos-company-name">SOS Staff Timesheet</div>
            <div className="sos-field-row">
              <span className="sos-label">Staff Name</span>
              <input
                className="sos-text-input no-print"
                value={ts.staff_name}
                onChange={e => onChange({ ...ts, staff_name: e.target.value })}
                placeholder="Enter staff name"
              />
              <span className="sos-print-value print-only">{ts.staff_name}</span>
            </div>
          </div>
          <div className="sos-summary">
            <div className="sos-summary-item">
              <span className="sos-summary-label">Total Hours</span>
              <span className="sos-summary-value">{totalHours.toFixed(1)}</span>
            </div>
            <div className="sos-summary-item">
              <span className="sos-summary-label">Total Mileage</span>
              <span className="sos-summary-value">{totalMileage.toFixed(1)} mi</span>
            </div>
            <div className="sos-summary-item">
              <span className="sos-summary-label">Mileage Cost</span>
              <span className="sos-summary-value">${mileageCost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Timesheet Grid */}
        <TimesheetGrid
          timesheet={ts}
          onUpdate={onChange}
        />
      </div>
    </div>
  );
}
