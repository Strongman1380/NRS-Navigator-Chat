import React from 'react';

export type TimesheetType = 'heartland' | 'sos';

interface Props {
  onSelect: (type: TimesheetType) => void;
}

export function LandingPage({ onSelect }: Props) {
  return (
    <div className="landing-page">
      <div className="landing-header">
        <h1 className="landing-title">Timesheet Manager</h1>
        <p className="landing-subtitle">Select a timesheet type to get started</p>
      </div>

      <div className="landing-cards">
        <div className="landing-card" onClick={() => onSelect('heartland')}>
          <div className="landing-card-icon">🏠</div>
          <div className="landing-card-title">Heartland Boys Home</div>
          <div className="landing-card-description">
            Weekly time card with time in/out, lunch breaks, and overtime tracking
          </div>
          <div className="landing-card-features">
            <span className="feature-tag">Time In/Out</span>
            <span className="feature-tag">Lunch Break</span>
            <span className="feature-tag">Overtime</span>
            <span className="feature-tag">Signature</span>
          </div>
        </div>

        <div className="landing-card" onClick={() => onSelect('sos')}>
          <div className="landing-card-icon">📋</div>
          <div className="landing-card-title">SOS Staff Timesheet</div>
          <div className="landing-card-description">
            Service-based tracking with billing codes, mileage, and client information
          </div>
          <div className="landing-card-features">
            <span className="feature-tag">Billing Codes</span>
            <span className="feature-tag">Mileage</span>
            <span className="feature-tag">Direct/Indirect</span>
            <span className="feature-tag">Client Tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
}
