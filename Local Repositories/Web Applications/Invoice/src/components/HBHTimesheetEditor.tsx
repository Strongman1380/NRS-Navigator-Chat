import React, { useRef } from 'react';
import { HBHTimesheet, Day, DAYS } from '../types/hbh';
import { calcWeek, splitHM, fmtHM } from '../utils/timesheetCalc';
import { SignaturePad } from './SignaturePad';

const DAY_LABELS: Record<Day, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

interface Props {
  ts: HBHTimesheet;
  onChange: (ts: HBHTimesheet) => void;
  onSave: () => void;
  onBack: () => void;
}

/** Format "HH:MM" 24h → "h:MM AM/PM" for print display */
function fmt12(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

function TimeInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
        className="time-cell-input no-print"
      />
      <span className="time-cell-print print-only">{fmt12(value)}</span>
    </>
  );
}

export function HBHTimesheetEditor({ ts, onChange, onSave, onBack }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const calc = calcWeek(ts.days);

  function setDay(day: Day, field: keyof (typeof ts.days)[Day], value: string) {
    onChange({
      ...ts,
      days: {
        ...ts.days,
        [day]: { ...ts.days[day], [field]: value },
      },
    });
  }

  function handlePrint() {
    window.print();
  }

  // Rows for the grid
  const rows: { key: keyof (typeof ts.days)[Day]; label: string }[] = [
    { key: 'timeIn',   label: 'TIME IN' },
    { key: 'lunchOut', label: 'LUNCH OUT' },
    { key: 'lunchIn',  label: 'LUNCH IN' },
    { key: 'timeOut',  label: 'TIME OUT' },
  ];

  const totalStraight = splitHM(calc.totalStraightMinutes);
  const totalOvertime = splitHM(calc.totalOvertimeMinutes);

  const signatureDate = ts.signatureDate || new Date().toLocaleDateString('en-US');

  return (
    <div className="hbh-editor">
      {/* ── Toolbar ── */}
      <div className="hbh-toolbar no-print">
        <button onClick={onBack} className="btn btn-ghost">← Saved Timesheets</button>
        <div className="hbh-toolbar-right">
          <button onClick={onSave} className="btn btn-primary">Save</button>
          <button onClick={handlePrint} className="btn btn-secondary">Print / Export</button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          PRINTABLE TIMECARD — matches HBH format
      ══════════════════════════════════════════════ */}
      <div className="hbh-card" ref={printRef}>

        {/* ── Card Header ── */}
        <div className="hbh-card-header">
          <div className="hbh-card-header-left">
            <div className="hbh-field-row">
              <span className="hbh-label">NAME</span>
              <div className="hbh-field-line">
                <input
                  className="hbh-text-input no-print"
                  value={ts.employeeName}
                  onChange={e => onChange({ ...ts, employeeName: e.target.value })}
                  placeholder="Employee name"
                />
                <span className="hbh-print-value print-only">{ts.employeeName}</span>
              </div>
            </div>
            <div className="hbh-field-row" style={{ marginTop: 10 }}>
              <span className="hbh-label">Week Ending</span>
              <div className="hbh-field-line" style={{ width: 140 }}>
                <input
                  type="date"
                  className="hbh-text-input no-print"
                  value={ts.weekEndingDate}
                  onChange={e => onChange({ ...ts, weekEndingDate: e.target.value })}
                />
                <span className="hbh-print-value print-only">
                  {ts.weekEndingDate
                    ? new Date(ts.weekEndingDate + 'T00:00:00').toLocaleDateString('en-US')
                    : ''}
                </span>
              </div>
              <span className="hbh-sublabel">(Sunday Date)</span>
            </div>
          </div>

          <div className="hbh-card-header-right">
            <div className="hbh-company-name">Heartland Boys Home, LLC</div>
            <div>914 Road P</div>
            <div>Geneva, Nebraska 68361</div>
            <div>402-759-4334</div>
          </div>
        </div>

        {/* ── Main Grid + Right Panel ── */}
        <div className="hbh-body">

          {/* Sideways label */}
          <div className="hbh-press-label">PRESS DOWN HARD</div>

          {/* Grid */}
          <div className="hbh-grid-wrap">
            <table className="hbh-table">
              <thead>
                <tr>
                  <th className="hbh-row-label-th"></th>
                  {DAYS.map(day => (
                    <th key={day} colSpan={2} className="hbh-day-th">
                      {DAY_LABELS[day].toUpperCase()}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="hbh-row-label-th"></th>
                  {DAYS.map(day => (
                    <React.Fragment key={day}>
                      <th className="hbh-hm-th">HRS</th>
                      <th className="hbh-hm-th">MIN</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Time input rows */}
                {rows.map(row => (
                  <tr key={row.key}>
                    <td className="hbh-row-label">{row.label}</td>
                    {DAYS.map(day => {
                      const val = ts.days[day][row.key];
                      return (
                        <td key={day} colSpan={2} className="hbh-time-cell">
                          <TimeInput
                            value={val}
                            onChange={v => setDay(day, row.key, v)}
                            label={`${DAY_LABELS[day]} ${row.label}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Total Straight Time */}
                <tr className="hbh-total-row">
                  <td className="hbh-row-label">TOTAL STRAIGHT TIME</td>
                  {DAYS.map(day => {
                    const { straightMinutes } = calc.days[day];
                    const { hrs, min } = splitHM(straightMinutes);
                    return (
                      <React.Fragment key={day}>
                        <td className="hbh-calc-cell">{straightMinutes > 0 ? hrs : ''}</td>
                        <td className="hbh-calc-cell">{straightMinutes > 0 ? String(min).padStart(2, '0') : ''}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>

                {/* Total Overtime */}
                <tr className="hbh-total-row">
                  <td className="hbh-row-label">TOTAL OVERTIME</td>
                  {DAYS.map(day => {
                    const { overtimeMinutes } = calc.days[day];
                    const { hrs, min } = splitHM(overtimeMinutes);
                    return (
                      <React.Fragment key={day}>
                        <td className="hbh-calc-cell">{overtimeMinutes > 0 ? hrs : ''}</td>
                        <td className="hbh-calc-cell">{overtimeMinutes > 0 ? String(min).padStart(2, '0') : ''}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right Panel */}
          <div className="hbh-right-panel">
            <div className="hbh-check-box">
              <div className="hbh-check-label">MAIL CHECK</div>
              <input
                className="hbh-check-input no-print"
                value={ts.mailCheck}
                onChange={e => onChange({ ...ts, mailCheck: e.target.value })}
                placeholder="#"
              />
              <span className="hbh-check-print print-only">{ts.mailCheck}</span>
            </div>
            <div className="hbh-check-box">
              <div className="hbh-check-label">PICK-UP CHECK</div>
              <input
                className="hbh-check-input no-print"
                value={ts.pickupCheck}
                onChange={e => onChange({ ...ts, pickupCheck: e.target.value })}
                placeholder="#"
              />
              <span className="hbh-check-print print-only">{ts.pickupCheck}</span>
            </div>

            <div className="hbh-total-block">
              <div className="hbh-total-title">TOTAL</div>
              <div className="hbh-total-row-item">
                <span className="hbh-total-item-label">STRAIGHT TIME</span>
                <span className="hbh-total-item-val">
                  {calc.totalStraightMinutes > 0 ? fmtHM(calc.totalStraightMinutes) : '—'}
                </span>
              </div>
              <div className="hbh-total-row-item">
                <span className="hbh-total-item-label">OVERTIME</span>
                <span className="hbh-total-item-val">
                  {calc.totalOvertimeMinutes > 0 ? fmtHM(calc.totalOvertimeMinutes) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Signature Row ── */}
        <div className="hbh-sig-row">
          <div className="hbh-sig-section">
            <div className="hbh-sig-label">EMPLOYEE SIGNATURE</div>
            <div className="hbh-sig-field no-print">
              <SignaturePad
                value={ts.signatureDataUrl}
                employeeName={ts.employeeName}
                onChange={dataUrl => onChange({ ...ts, signatureDataUrl: dataUrl })}
              />
            </div>
            {/* Print view: show typed name in cursive or drawn signature */}
            <div className="hbh-sig-print print-only">
              {ts.signatureDataUrl
                ? <img src={ts.signatureDataUrl} alt="Signature" className="hbh-sig-img" />
                : <span className="hbh-sig-cursive">{ts.employeeName}</span>}
            </div>
            <div className="hbh-sig-underline"></div>
          </div>

          <div className="hbh-date-section">
            <div className="hbh-sig-label">DATE</div>
            <input
              type="date"
              className="hbh-text-input no-print"
              value={ts.signatureDate}
              onChange={e => onChange({ ...ts, signatureDate: e.target.value })}
            />
            <div className="hbh-sig-underline"></div>
            <div className="hbh-date-print print-only">
              {ts.signatureDate
                ? new Date(ts.signatureDate + 'T00:00:00').toLocaleDateString('en-US')
                : signatureDate}
            </div>
          </div>
        </div>

      </div>{/* end .hbh-card */}
    </div>
  );
}
