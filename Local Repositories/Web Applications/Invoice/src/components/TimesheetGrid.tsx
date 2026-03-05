import React, { useState } from 'react';
import { Timesheet, TimesheetEntry } from '../types';
import './TimesheetGrid.css';

const BILLING_CODES = [
  'Database Development',
  'Intake Paperwork Development',
  'Website Development',
  'Revenue Plan',
  'Staff Meeting',
  'Case Management',
  'Administrative',
  'Training',
  'Other',
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function buildEmptyEntry(payPeriodStart: string): TimesheetEntry {
  // Default date to the pay period start
  const today = payPeriodStart || new Date().toLocaleDateString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric'
  });
  return {
    id: generateId(),
    date: today,
    billing_code: '',
    hours: 0,
    client: '',
    direct: false,
    indirect: false,
    mileage: 0,
    notes: '',
  };
}

interface TimesheetGridProps {
  timesheet: Timesheet;
  onUpdate: (timesheet: Timesheet) => void;
}

export function TimesheetGrid({ timesheet, onUpdate }: TimesheetGridProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateEntry = (id: string, patch: Partial<TimesheetEntry>) => {
    const entries = timesheet.entries.map(e => e.id === id ? { ...e, ...patch } : e);
    onUpdate({ ...timesheet, entries });
  };

  const deleteEntry = (id: string) => {
    const entries = timesheet.entries.filter(e => e.id !== id);
    onUpdate({ ...timesheet, entries });
  };

  const addRow = () => {
    const newEntry = buildEmptyEntry(timesheet.pay_period_start);
    onUpdate({ ...timesheet, entries: [...timesheet.entries, newEntry] });
    setEditingId(newEntry.id);
  };

  const totalHours = timesheet.entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const totalMileage = timesheet.entries.reduce((sum, e) => sum + (e.mileage || 0), 0);

  return (
    <div className="ts-wrapper">
      <div className="ts-pay-period">
        <span>Pay Period:</span>
        <input
          type="text"
          placeholder="MM/DD/YYYY"
          value={timesheet.pay_period_start}
          onChange={e => onUpdate({ ...timesheet, pay_period_start: e.target.value })}
          className="ts-period-input"
        />
        <span>–</span>
        <input
          type="text"
          placeholder="MM/DD/YYYY"
          value={timesheet.pay_period_end}
          onChange={e => onUpdate({ ...timesheet, pay_period_end: e.target.value })}
          className="ts-period-input"
        />
      </div>

      <div className="ts-table-scroll">
        <table className="ts-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Billing Code</th>
              <th>Time</th>
              <th>Client</th>
              <th className="ts-center">Direct</th>
              <th className="ts-center">Indirect</th>
              <th className="ts-center">Mileage</th>
              <th>Notes</th>
              <th className="ts-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {timesheet.entries.length === 0 && (
              <tr>
                <td colSpan={9} className="ts-empty">No entries yet. Click "+ Add Row" to begin.</td>
              </tr>
            )}
            {timesheet.entries.map(entry => {
              const isEditing = editingId === entry.id;
              return (
                <tr key={entry.id} className={isEditing ? 'ts-row-editing' : ''}>
                  {/* Date */}
                  <td>
                    <input
                      type="text"
                      value={entry.date}
                      onChange={e => updateEntry(entry.id, { date: e.target.value })}
                      placeholder="MM/DD/YYYY"
                      className="ts-input ts-date"
                    />
                  </td>

                  {/* Billing Code */}
                  <td>
                    <select
                      value={BILLING_CODES.includes(entry.billing_code) ? entry.billing_code : 'Other'}
                      onChange={e => {
                        if (e.target.value !== 'Other') {
                          updateEntry(entry.id, { billing_code: e.target.value });
                        }
                      }}
                      className="ts-select"
                    >
                      <option value="">Select...</option>
                      {BILLING_CODES.map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                    {(!BILLING_CODES.includes(entry.billing_code) || entry.billing_code === 'Other') && (
                      <input
                        type="text"
                        value={entry.billing_code}
                        onChange={e => updateEntry(entry.id, { billing_code: e.target.value })}
                        placeholder="Custom billing code..."
                        className="ts-input ts-billing-custom"
                      />
                    )}
                  </td>

                  {/* Time (hours) */}
                  <td>
                    <input
                      type="number"
                      value={entry.hours || ''}
                      onChange={e => updateEntry(entry.id, { hours: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.5"
                      className="ts-input ts-hours"
                      placeholder="0"
                    />
                  </td>

                  {/* Client */}
                  <td>
                    <input
                      type="text"
                      value={entry.client}
                      onChange={e => updateEntry(entry.id, { client: e.target.value })}
                      placeholder="Client / Organization"
                      className="ts-input ts-client"
                    />
                  </td>

                  {/* Direct */}
                  <td className="ts-center">
                    <input
                      type="checkbox"
                      checked={entry.direct}
                      onChange={e => updateEntry(entry.id, {
                        direct: e.target.checked,
                        indirect: e.target.checked ? false : entry.indirect
                      })}
                      className="ts-checkbox"
                    />
                  </td>

                  {/* Indirect */}
                  <td className="ts-center">
                    <input
                      type="checkbox"
                      checked={entry.indirect}
                      onChange={e => updateEntry(entry.id, {
                        indirect: e.target.checked,
                        direct: e.target.checked ? false : entry.direct
                      })}
                      className="ts-checkbox"
                    />
                  </td>

                  {/* Mileage */}
                  <td className="ts-center">
                    <input
                      type="number"
                      value={entry.mileage || ''}
                      onChange={e => updateEntry(entry.id, { mileage: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.1"
                      className="ts-input ts-mileage"
                      placeholder="0"
                    />
                  </td>

                  {/* Notes */}
                  <td>
                    <input
                      type="text"
                      value={entry.notes}
                      onChange={e => updateEntry(entry.id, { notes: e.target.value })}
                      placeholder="Notes..."
                      className="ts-input ts-notes"
                    />
                  </td>

                  {/* Actions */}
                  <td className="ts-center ts-actions">
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="ts-btn-delete"
                      title="Delete row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="ts-totals">
              <td colSpan={2} className="ts-totals-label">TOTALS</td>
              <td className="ts-center ts-total-val">{totalHours}</td>
              <td colSpan={3}></td>
              <td className="ts-center ts-total-val">{totalMileage > 0 ? totalMileage : ''}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="ts-footer-actions">
        <button onClick={addRow} className="ts-btn-add">+ Add Row</button>
      </div>
    </div>
  );
}
