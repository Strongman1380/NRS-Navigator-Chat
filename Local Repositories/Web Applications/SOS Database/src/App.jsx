import React, { useState, useEffect, useMemo, useCallback } from "react";
import { LucideIcon } from "./components/LucideIcon";
import { Button } from "./components/Button";
import { Toast } from "./components/Toast";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { db, auth, firebase } from "./config/firebase";
import { COLLECTIONS, EMPTY_ENTRY, EMPTY_AUDIT, EMPTY_SETTINGS, ADMIN_EMAIL, STAFF_EMAIL_MAP } from "./config/constants";
import { todayStr, formatDate } from "./utils/dateHelpers";
import { useComplianceAlerts } from "./hooks/useComplianceAlerts";
import { useAuditAlerts } from "./hooks/useAuditAlerts";
import { handleExportPDF, handlePrintEntry } from "./utils/pdfExport";
import { migrateData } from "./utils/migration";
import { seedDemoData } from "./utils/seedDemoData";

// Feature components
import Dashboard from "./features/dashboard/Dashboard";
import { SettingsModal } from "./features/settings/SettingsModal";
import { ClientList } from "./features/clients/ClientList";
import { ClientDetail } from "./features/clients/ClientDetail";
import { ClientForm } from "./features/clients/ClientForm";
import { DischargeModal } from "./features/clients/DischargeModal";
import { NoteForm } from "./features/notes/NoteForm";
import { NoteHistory } from "./features/notes/NoteHistory";
import { NoteViewModal } from "./features/notes/NoteViewModal";
import { AuditForm } from "./features/audits/AuditForm";
import { AuditViewModal } from "./features/audits/AuditViewModal";

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  // ─── State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState({ ...EMPTY_SETTINGS });
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [migrated, setMigrated] = useState(false);

  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Client state
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [clientFormData, setClientFormData] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  // Entry state
  const [entryForm, setEntryForm] = useState({ ...EMPTY_ENTRY, date: todayStr() });
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);

  // Audit state
  const [audits, setAudits] = useState([]);
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [editingAudit, setEditingAudit] = useState(null);
  const [viewingAudit, setViewingAudit] = useState(null);

  // Modals
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ─── Compliance Alerts ─────────────────────────────────────────────────
  const alerts = useComplianceAlerts(clients);
  const auditAlerts = useAuditAlerts(audits, clients);
  const allAlerts = useMemo(
    () => [...alerts, ...auditAlerts],
    [alerts, auditAlerts]
  );

  const urgentAlertCount = useMemo(
    () => allAlerts.filter((a) => a.urgency === "overdue" || a.urgency === "critical").length,
    [allAlerts]
  );

  // ─── Derived data ─────────────────────────────────────────────────────
  const activeClients = useMemo(() => clients.filter((c) => !c.isArchived && !c.isDischarged), [clients]);

  // ─── Staff-scoped client visibility ───────────────────────────────────
  // Admins see all clients. Staff see only clients where their name appears
  // as assignedStaff in at least one service.
  const visibleClients = useMemo(() => {
    if (!user) return [];
    if (user.email === ADMIN_EMAIL) return clients;
    const staffName = STAFF_EMAIL_MAP[user.email];
    if (!staffName) return clients; // unknown email — show all (safe fallback until emails are filled in)
    return clients.filter((c) =>
      Object.values(c.services || {}).some((svc) => svc.assignedStaff === staffName)
    );
  }, [clients, user]);

  const visibleActiveClients = useMemo(
    () => visibleClients.filter((c) => !c.isArchived && !c.isDischarged),
    [visibleClients]
  );

  // ─── Auth listener ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ─── Firestore listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!db || !user) { setLoading(false); return; }

    setLoading(true);

    const unsubClients = db.collection(COLLECTIONS.CLIENTS)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) => {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setClients(data);
          setLoading(false);
        },
        (err) => { console.error("Clients listener error:", err); setLoading(false); }
      );

    const unsubEntries = db.collection(COLLECTIONS.ENTRIES)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) => {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setEntries(data);
        },
        (err) => { console.error("Entries listener error:", err); }
      );

    // Load audits
    const unsubAudits = db.collection(COLLECTIONS.AUDITS)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) => {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setAudits(data);
        },
        (err) => { console.error("Audits listener error:", err); }
      );

    // Load provider settings
    const unsubSettings = db.collection(COLLECTIONS.SETTINGS).doc("provider")
      .onSnapshot(
        (snap) => {
          if (snap.exists) setSettings({ ...EMPTY_SETTINGS, ...snap.data() });
        },
        (err) => { console.error("Settings listener error:", err); }
      );

    return () => { unsubClients(); unsubEntries(); unsubAudits(); unsubSettings(); };
  }, [user]);

  // ─── Data migration (run once) ────────────────────────────────────────
  useEffect(() => {
    if (!db || !user || migrated || loading) return;
    migrateData(db).then(() => setMigrated(true));
  }, [db, user, migrated, loading]);

  // ─── Auth handlers ─────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setLoginError("");
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (err) { setLoginError(err.message || "Login failed"); }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail.trim() || !loginPassword) { setLoginError("Email and password are required"); return; }
    setLoginLoading(true);
    try {
      await auth.signInWithEmailAndPassword(loginEmail.trim(), loginPassword);
    } catch (err) {
      const code = err.code;
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setLoginError("Invalid email or password");
      } else if (code === "auth/too-many-requests") {
        setLoginError("Too many attempts. Please try again later.");
      } else {
        setLoginError(err.message || "Login failed");
      }
    } finally { setLoginLoading(false); }
  };

  const handleSignOut = async () => {
    try { await auth.signOut(); } catch (err) { console.error("Sign out error:", err); }
  };

  // ─── Demo data seeder (admin only) ─────────────────────────────────────
  const [seedLoading, setSeedLoading] = useState(false);
  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleSeedData = async () => {
    if (!isAdmin || !db) return;
    setSeedLoading(true);
    try {
      const result = await seedDemoData(db);
      showToast(`Loaded ${result.clients} clients, ${result.entries} notes, ${result.audits} audits`);
    } catch (err) {
      console.error("Seed error:", err);
      showToast("Failed to load demo data", "error");
    } finally {
      setSeedLoading(false);
    }
  };

  // ─── Toast helper ──────────────────────────────────────────────────────
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  // ─── Client CRUD ───────────────────────────────────────────────────────
  const handleSaveClient = async (form) => {
    if (!form.clientName.trim()) { showToast("Client name is required", "error"); return; }
    try {
      const now = new Date().toISOString();
      const { id, ...data } = form;
      if (editingClientId) {
        await db.collection(COLLECTIONS.CLIENTS).doc(editingClientId).update({ ...data, updatedAt: now, _schemaVersion: 2 });
        showToast("Client updated");
      } else {
        await db.collection(COLLECTIONS.CLIENTS).add({ ...data, createdAt: now, updatedAt: now, _schemaVersion: 2 });
        showToast("Client added");
      }
      setShowClientForm(false);
      setEditingClientId(null);
      setClientFormData(null);
    } catch (err) {
      console.error("Save client error:", err);
      showToast("Failed to save client", "error");
    }
  };

  const handleEditClient = (client) => {
    setClientFormData({ ...client });
    setEditingClientId(client.id);
    setShowClientForm(true);
  };

  const handleAddClient = () => {
    setClientFormData(null);
    setEditingClientId(null);
    setShowClientForm(true);
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setActiveTab("clientDetail");
    setMobileMenuOpen(false);
  };

  const handleDischargeClient = async (form) => {
    if (!selectedClient) return;
    try {
      // Deactivate all services
      const updatedServices = { ...(selectedClient.services || {}) };
      Object.keys(updatedServices).forEach((code) => {
        updatedServices[code] = { ...updatedServices[code], active: false };
      });

      await db.collection(COLLECTIONS.CLIENTS).doc(selectedClient.id).update({
        isDischarged: true,
        isArchived: true,
        dischargeDate: form.date,
        dischargeReason: form.reason,
        dischargeSummary: form.summary,
        services: updatedServices,
        updatedAt: new Date().toISOString(),
      });
      showToast("Client discharged");
      setShowDischargeModal(false);
      setSelectedClient(null);
      setActiveTab("clients");
    } catch (err) {
      console.error("Discharge client error:", err);
      showToast("Failed to discharge client", "error");
    }
  };

  const handleReactivateClient = async () => {
    if (!selectedClient) return;
    try {
      await db.collection(COLLECTIONS.CLIENTS).doc(selectedClient.id).update({
        isDischarged: false,
        isArchived: false,
        dischargeDate: "",
        dischargeReason: "",
        dischargeSummary: "",
        updatedAt: new Date().toISOString(),
      });
      showToast("Client reactivated");
      setSelectedClient(null);
      setActiveTab("clients");
    } catch (err) {
      console.error("Reactivate client error:", err);
      showToast("Failed to reactivate client", "error");
    }
  };

  const handleDeleteClient = () => {
    if (!selectedClient) return;
    setConfirmDialog({
      title: "Delete Client",
      message: `Are you sure you want to permanently delete "${selectedClient.clientName}"? This will also delete all their case notes.`,
      onConfirm: async () => {
        try {
          const entrySnap = await db.collection(COLLECTIONS.ENTRIES).where("clientId", "==", selectedClient.id).get();
          const auditSnap = await db.collection(COLLECTIONS.AUDITS).where("clientId", "==", selectedClient.id).get();
          const batch = db.batch();
          entrySnap.docs.forEach((d) => batch.delete(d.ref));
          auditSnap.docs.forEach((d) => batch.delete(d.ref));
          batch.delete(db.collection(COLLECTIONS.CLIENTS).doc(selectedClient.id));
          await batch.commit();
          setSelectedClient(null);
          setConfirmDialog(null);
          setActiveTab("clients");
          showToast("Client deleted");
        } catch (err) {
          console.error("Delete client error:", err);
          showToast("Failed to delete client", "error");
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // ─── Entry CRUD ────────────────────────────────────────────────────────
  const handleSaveEntry = async () => {
    if (!entryForm.clientId) { showToast("Please select a client", "error"); return; }
    if (!entryForm.serviceType) { showToast("Please select a service type", "error"); return; }
    if (!entryForm.date) { showToast("Date is required", "error"); return; }
    if (!entryForm.interventionOutcomes?.trim()) { showToast("Intervention/Outcomes is required", "error"); return; }

    try {
      const now = new Date().toISOString();
      const { id, ...data } = entryForm;
      if (editingEntryId) {
        await db.collection(COLLECTIONS.ENTRIES).doc(editingEntryId).update({ ...data, updatedAt: now, _schemaVersion: 2 });
        showToast("Case note updated");
      } else {
        await db.collection(COLLECTIONS.ENTRIES).add({ ...data, createdAt: now, updatedAt: now, _schemaVersion: 2 });
        showToast("Case note saved");
      }
      setEntryForm({ ...EMPTY_ENTRY, date: todayStr() });
      setEditingEntryId(null);
    } catch (err) {
      console.error("Save entry error:", err);
      showToast("Failed to save case note", "error");
    }
  };

  const handleEditEntry = (entry) => {
    setEntryForm({ ...EMPTY_ENTRY, ...entry });
    setEditingEntryId(entry.id);
    setActiveTab("form");
    setViewingEntry(null);
    setMobileMenuOpen(false);
  };

  const handleDeleteEntry = (entry) => {
    setConfirmDialog({
      title: "Delete Case Note",
      message: `Delete the case note for "${entry.clientName}" on ${formatDate(entry.date)}?`,
      onConfirm: async () => {
        try {
          await db.collection(COLLECTIONS.ENTRIES).doc(entry.id).delete();
          setViewingEntry(null);
          setConfirmDialog(null);
          showToast("Case note deleted");
        } catch (err) {
          console.error("Delete entry error:", err);
          showToast("Failed to delete note", "error");
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleArchiveEntry = async (entry) => {
    try {
      await db.collection(COLLECTIONS.ENTRIES).doc(entry.id).update({
        isArchived: !entry.isArchived,
        updatedAt: new Date().toISOString(),
      });
      showToast(entry.isArchived ? "Note restored" : "Note archived");
      setViewingEntry(null);
    } catch (err) {
      console.error("Archive entry error:", err);
      showToast("Failed to update note", "error");
    }
  };

  // ─── Settings ──────────────────────────────────────────────────────────
  const handleSaveSettings = async (form) => {
    try {
      await db.collection(COLLECTIONS.SETTINGS).doc("provider").set(form, { merge: true });
      showToast("Settings saved");
      setShowSettings(false);
    } catch (err) {
      console.error("Save settings error:", err);
      showToast("Failed to save settings", "error");
    }
  };

  // ─── Audit CRUD ───────────────────────────────────────────────────────
  const handleSaveAudit = async (form) => {
    if (!form.clientId) { showToast("Client is required", "error"); return; }
    if (!form.serviceType) { showToast("Service type is required", "error"); return; }
    if (!form.audit_date) { showToast("Audit date is required", "error"); return; }
    if (!form.auditor_name?.trim()) { showToast("Auditor name is required", "error"); return; }
    if (!form.audit_period_start) { showToast("Audit period start is required", "error"); return; }
    if (!form.audit_period_end) { showToast("Audit period end is required", "error"); return; }
    try {
      const now = new Date().toISOString();
      const { id, ...data } = form;
      if (editingAudit?.id) {
        await db.collection(COLLECTIONS.AUDITS).doc(editingAudit.id).update({ ...data, updatedAt: now });
        showToast("Audit updated");
      } else {
        await db.collection(COLLECTIONS.AUDITS).add({ ...data, createdAt: now, updatedAt: now });
        showToast("Audit saved");
      }
      setShowAuditForm(false);
      setEditingAudit(null);
    } catch (err) {
      console.error("Save audit error:", err);
      showToast("Failed to save audit", "error");
    }
  };

  const handleDeleteAudit = (audit) => {
    setConfirmDialog({
      title: "Delete Audit",
      message: `Delete the QA audit from ${formatDate(audit.audit_date)} for "${audit.clientName}"?`,
      onConfirm: async () => {
        try {
          await db.collection(COLLECTIONS.AUDITS).doc(audit.id).delete();
          setViewingAudit(null);
          setConfirmDialog(null);
          showToast("Audit deleted");
        } catch (err) {
          console.error("Delete audit error:", err);
          showToast("Failed to delete audit", "error");
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // ─── Navigation ────────────────────────────────────────────────────────
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { id: "form", label: "New Note", icon: "FileEdit" },
    { id: "history", label: "Note History", icon: "Table" },
    { id: "clients", label: "Clients", icon: "Users" },
  ];

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    if (tabId !== "clientDetail") setSelectedClient(null);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div style={{ width: 48, height: 48, border: "3px solid #e5e7eb", borderTopColor: "#8B1A1A", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full animate-scaleIn">
          <div className="text-center mb-6">
            <img src="/logo.png" alt="S.O.S. Counseling" className="mx-auto mb-3" style={{ maxHeight: "60px", width: "auto" }} />
            <h1 className="text-xl font-bold" style={{ color: "var(--brand-red)" }}>S.O.S. Case Notes</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
          </div>
          {loginError && <p className="text-sm text-red-600 mb-4 text-center">{loginError}</p>}

          {/* Email/Password Login */}
          <form onSubmit={handleEmailLogin} className="mb-4">
            <div className="mb-3">
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all" autoComplete="email" />
            </div>
            <div className="mb-3">
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all" autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loginLoading} className="w-full rounded-lg py-2.5 px-4 text-sm font-medium text-white transition-all shadow-sm disabled:opacity-50" style={{ background: "var(--brand-red)" }}>
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google Login */}
          <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Loading data
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div style={{ width: 48, height: 48, border: "3px solid #e5e7eb", borderTopColor: "#8B1A1A", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p className="text-gray-500 text-sm">Loading data...</p>
        </div>
      </div>
    );
  }

  // ─── Client entries for detail view ────────────────────────────────────
  const clientEntries = selectedClient
    ? entries.filter((e) => e.clientId === selectedClient.id)
    : [];

  // Resolve selected client from visible list (keeps detail in sync with filtering)
  const resolvedSelectedClient = selectedClient
    ? (visibleClients.find((c) => c.id === selectedClient.id) || selectedClient)
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Toast & Dialogs ──────────────────────────────────────────────── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmDialog && <ConfirmDialog {...confirmDialog} />}

      {/* ─── Top Navigation ───────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <LucideIcon name={mobileMenuOpen ? "X" : "Menu"} className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="S.O.S." className="w-10 h-10 object-contain" />
                <div>
                  <h1 className="text-lg font-bold leading-tight" style={{ color: "var(--brand-red)" }}>S.O.S. Case Notes</h1>
                  <p className="text-xs text-gray-400 hidden sm:block">Specialized Outpatient Services</p>
                </div>
              </div>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  style={activeTab === tab.id ? { background: "var(--brand-red)" } : {}}
                >
                  <LucideIcon name={tab.icon} className="w-4 h-4" />
                  {tab.label}
                  {tab.id === "dashboard" && urgentAlertCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                      {urgentAlertCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Right: Settings + User */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={handleSeedData}
                  disabled={seedLoading}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-dashed border-gray-300 transition-colors disabled:opacity-50"
                  title="Load demo clients and case notes (admin only)"
                >
                  <LucideIcon name="DatabaseZap" className="w-3.5 h-3.5" />
                  {seedLoading ? "Loading…" : "Load Demo Data"}
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Provider Settings"
              >
                <LucideIcon name="Settings" className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                {user.photoURL && (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                )}
                <span className="text-sm text-gray-600 hidden sm:inline">{user.displayName || user.email}</span>
                <button onClick={handleSignOut} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Sign out">
                  <LucideIcon name="LogOut" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white shadow-lg">
            <div className="px-4 py-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  style={activeTab === tab.id ? { background: "var(--brand-red)" } : {}}
                >
                  <LucideIcon name={tab.icon} className="w-5 h-5" />
                  {tab.label}
                  {tab.id === "dashboard" && urgentAlertCount > 0 && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                      {urgentAlertCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <Dashboard
            clients={visibleClients}
            entries={entries}
            alerts={allAlerts}
            audits={audits}
            onSelectClient={(clientId) => {
              const client = visibleClients.find((c) => c.id === clientId);
              if (client) handleSelectClient(client);
            }}
            onSwitchTab={switchTab}
          />
        )}

        {/* New Note / Edit Note */}
        {activeTab === "form" && (
          <NoteForm
            clients={visibleClients}
            entryForm={entryForm}
            setEntryForm={setEntryForm}
            editingEntryId={editingEntryId}
            onSave={handleSaveEntry}
            onCancelEdit={() => {
              setEntryForm({ ...EMPTY_ENTRY, date: todayStr() });
              setEditingEntryId(null);
            }}
          />
        )}

        {/* Note History */}
        {activeTab === "history" && (
          <NoteHistory
            entries={entries}
            clients={visibleClients}
            activeClients={visibleActiveClients}
            onViewEntry={(entry) => setViewingEntry(entry)}
            onSwitchToForm={() => switchTab("form")}
          />
        )}

        {/* Client List */}
        {activeTab === "clients" && (
          <ClientList
            clients={visibleClients}
            entries={entries}
            activeClients={visibleActiveClients}
            onSelectClient={handleSelectClient}
            onAddClient={handleAddClient}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
          />
        )}

        {/* Client Detail */}
        {activeTab === "clientDetail" && resolvedSelectedClient && (
          <ClientDetail
            client={resolvedSelectedClient}
            entries={clientEntries}
            alerts={allAlerts}
            audits={audits.filter((a) => a.clientId === resolvedSelectedClient.id)}
            onBack={() => switchTab("clients")}
            onEdit={() => handleEditClient(resolvedSelectedClient)}
            onDischarge={() => setShowDischargeModal(true)}
            onReactivate={handleReactivateClient}
            onDelete={handleDeleteClient}
            onViewEntry={(entry) => setViewingEntry(entry)}
            onCreateNote={() => {
              setEntryForm({
                ...EMPTY_ENTRY,
                date: todayStr(),
                clientId: resolvedSelectedClient.id,
                clientName: resolvedSelectedClient.clientName,
                masterCaseNumber: resolvedSelectedClient.masterCaseNumber || "",
              });
              setEditingEntryId(null);
              switchTab("form");
            }}
            onNewAudit={() => {
              setEditingAudit(null);
              setShowAuditForm(true);
            }}
            onViewAudit={(audit) => setViewingAudit(audit)}
          />
        )}
      </main>

      {/* ─── Modals ───────────────────────────────────────────────────────── */}

      {/* Client Form Modal */}
      {showClientForm && (
        <ClientForm
          client={clientFormData}
          editingId={editingClientId}
          onSave={handleSaveClient}
          onClose={() => { setShowClientForm(false); setEditingClientId(null); setClientFormData(null); }}
        />
      )}

      {/* Discharge Modal */}
      {showDischargeModal && selectedClient && (
        <DischargeModal
          client={selectedClient}
          onDischarge={handleDischargeClient}
          onClose={() => setShowDischargeModal(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Note View Modal */}
      {viewingEntry && (
        <NoteViewModal
          entry={viewingEntry}
          onClose={() => setViewingEntry(null)}
          onEdit={() => handleEditEntry(viewingEntry)}
          onArchive={() => handleArchiveEntry(viewingEntry)}
          onDelete={() => handleDeleteEntry(viewingEntry)}
          onPrint={() => handlePrintEntry(viewingEntry, showToast)}
          onExportPDF={() => handleExportPDF(viewingEntry, showToast)}
        />
      )}

      {/* Audit Form Modal */}
      {showAuditForm && resolvedSelectedClient && (
        <AuditForm
          client={resolvedSelectedClient}
          audit={editingAudit}
          onSave={handleSaveAudit}
          onClose={() => { setShowAuditForm(false); setEditingAudit(null); }}
        />
      )}

      {/* Audit View Modal */}
      {viewingAudit && (
        <AuditViewModal
          audit={viewingAudit}
          onClose={() => setViewingAudit(null)}
          onEdit={() => {
            setEditingAudit(viewingAudit);
            setViewingAudit(null);
            setShowAuditForm(true);
          }}
          onDelete={() => handleDeleteAudit(viewingAudit)}
        />
      )}
    </div>
  );
}
