import React, { useState, useEffect } from 'react';
import { HBHTimesheet } from '../types/hbh';
import { Timesheet } from '../types';
import { loadAll, saveTimesheet, deleteTimesheet, newTimesheet } from '../utils/hbhStorage';
import { loadAllSOS, saveSOSTimesheet, deleteSOSTimesheet, newSOSTimesheet } from '../utils/sosStorage';
import { LandingPage, TimesheetType } from './LandingPage';
import { TimesheetList } from './TimesheetList';
import { HBHTimesheetEditor } from './HBHTimesheetEditor';
import { SOSTimesheetList } from './SOSTimesheetList';
import { SOSTimesheetEditor } from './SOSTimesheetEditor';
import './App.css';

type View = 'landing' | 'hbh-list' | 'hbh-edit' | 'sos-list' | 'sos-edit';

export function App() {
  const [view, setView] = useState<View>('landing');
  
  // HBH state
  const [hbhTimesheets, setHbhTimesheets] = useState<HBHTimesheet[]>([]);
  const [currentHbh, setCurrentHbh] = useState<HBHTimesheet | null>(null);
  
  // SOS state
  const [sosTimesheets, setSosTimesheets] = useState<Timesheet[]>([]);
  const [currentSos, setCurrentSos] = useState<Timesheet | null>(null);

  useEffect(() => {
    setHbhTimesheets(loadAll());
    setSosTimesheets(loadAllSOS());
  }, []);

  // Landing page handler
  function handleSelectType(type: TimesheetType) {
    if (type === 'heartland') {
      setHbhTimesheets(loadAll());
      setView('hbh-list');
    } else {
      setSosTimesheets(loadAllSOS());
      setView('sos-list');
    }
  }

  function handleBackToLanding() {
    setView('landing');
  }

  // HBH handlers
  function openHbhTimesheet(ts: HBHTimesheet) {
    setCurrentHbh(ts);
    setView('hbh-edit');
  }

  function handleNewHbh(ts: HBHTimesheet) {
    const saved = saveTimesheet(ts);
    setCurrentHbh(saved);
    setHbhTimesheets(loadAll());
    setView('hbh-edit');
  }

  function handleChangeHbh(ts: HBHTimesheet) {
    setCurrentHbh(ts);
    // Auto-save every change so data is never lost
    const saved = saveTimesheet(ts);
    setHbhTimesheets(loadAll());
  }

  function handleSaveHbh() {
    if (!currentHbh) return;
    const saved = saveTimesheet(currentHbh);
    setCurrentHbh(saved);
    setHbhTimesheets(loadAll());
    // Brief flash to confirm
    const btn = document.querySelector('.btn-primary') as HTMLButtonElement;
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Saved ✓';
      setTimeout(() => { btn.textContent = orig; }, 1200);
    }
  }

  function handleDeleteHbh(id: string) {
    deleteTimesheet(id);
    setHbhTimesheets(loadAll());
  }

  function handleBackHbh() {
    setCurrentHbh(null);
    setHbhTimesheets(loadAll());
    setView('hbh-list');
  }

  // SOS handlers
  function openSosTimesheet(ts: Timesheet) {
    setCurrentSos(ts);
    setView('sos-edit');
  }

  function handleNewSos(ts: Timesheet) {
    const saved = saveSOSTimesheet(ts);
    setCurrentSos(saved);
    setSosTimesheets(loadAllSOS());
    setView('sos-edit');
  }

  function handleChangeSos(ts: Timesheet) {
    setCurrentSos(ts);
    // Auto-save every change so data is never lost
    const saved = saveSOSTimesheet(ts);
    setSosTimesheets(loadAllSOS());
  }

  function handleSaveSos() {
    if (!currentSos) return;
    const saved = saveSOSTimesheet(currentSos);
    setCurrentSos(saved);
    setSosTimesheets(loadAllSOS());
    // Brief flash to confirm
    const btn = document.querySelector('.btn-primary') as HTMLButtonElement;
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Saved ✓';
      setTimeout(() => { btn.textContent = orig; }, 1200);
    }
  }

  function handleDeleteSos(id: string) {
    deleteSOSTimesheet(id);
    setSosTimesheets(loadAllSOS());
  }

  function handleBackSos() {
    setCurrentSos(null);
    setSosTimesheets(loadAllSOS());
    setView('sos-list');
  }

  const lastHbhName = hbhTimesheets[0]?.employeeName ?? '';
  const lastSosName = sosTimesheets[0]?.staff_name ?? '';

  // Render based on view
  switch (view) {
    case 'landing':
      return <LandingPage onSelect={handleSelectType} />;
    
    case 'hbh-list':
      return (
        <TimesheetList
          timesheets={hbhTimesheets}
          onSelect={openHbhTimesheet}
          onNew={handleNewHbh}
          onDelete={handleDeleteHbh}
          onBack={handleBackToLanding}
          lastEmployeeName={lastHbhName}
        />
      );
    
    case 'hbh-edit':
      return currentHbh ? (
        <HBHTimesheetEditor
          ts={currentHbh}
          onChange={handleChangeHbh}
          onSave={handleSaveHbh}
          onBack={handleBackHbh}
        />
      ) : null;
    
    case 'sos-list':
      return (
        <SOSTimesheetList
          timesheets={sosTimesheets}
          onSelect={openSosTimesheet}
          onNew={handleNewSos}
          onDelete={handleDeleteSos}
          onBack={handleBackToLanding}
          lastStaffName={lastSosName}
        />
      );
    
    case 'sos-edit':
      return currentSos ? (
        <SOSTimesheetEditor
          ts={currentSos}
          onChange={handleChangeSos}
          onSave={handleSaveSos}
          onBack={handleBackSos}
        />
      ) : null;
    
    default:
      return <LandingPage onSelect={handleSelectType} />;
  }
}
