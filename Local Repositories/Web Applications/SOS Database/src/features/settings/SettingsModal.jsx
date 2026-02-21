import React, { useState } from "react";
import { LucideIcon } from "../../components/LucideIcon";
import { Button } from "../../components/Button";
import { InputField } from "../../components/InputField";
import { EMPTY_SETTINGS } from "../../config/constants";

export function SettingsModal({ settings, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_SETTINGS,
    ...settings,
  }));

  const update = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <LucideIcon name="Settings" className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Provider Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Close"
          >
            <LucideIcon name="X" className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <InputField
            label="Billing Facility NPI"
            value={form.billingFacilityNpi}
            onChange={update("billingFacilityNpi")}
            placeholder="10-digit NPI"
          />

          <InputField
            label="Rendering Provider NPI"
            value={form.renderingProviderNpi}
            onChange={update("renderingProviderNpi")}
            placeholder="10-digit NPI"
          />

          <InputField
            label="Taxonomy Code"
            value={form.taxonomyCode}
            onChange={update("taxonomyCode")}
            placeholder="e.g. 101YM0800X"
          />

          <InputField
            label="Practice Name"
            value={form.practiceName}
            onChange={update("practiceName")}
            placeholder="SOS Counseling, LLC"
          />

          <InputField
            label="Practice Address"
            type="textarea"
            rows={3}
            value={form.practiceAddress}
            onChange={update("practiceAddress")}
            placeholder="Street, City, State ZIP"
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} iconName="Save">
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
