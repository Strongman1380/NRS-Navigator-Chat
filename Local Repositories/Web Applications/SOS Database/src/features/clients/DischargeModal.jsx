import React, { useState } from "react";
import { LucideIcon } from "../../components/LucideIcon";
import { Button } from "../../components/Button";
import { InputField } from "../../components/InputField";
import { DISCHARGE_REASONS } from "../../config/constants";
import { todayStr } from "../../utils/dateHelpers";

export function DischargeModal({ client, onDischarge, onClose }) {
  const [form, setForm] = useState({
    date: todayStr(),
    reason: "",
    summary: "",
  });
  const [errors, setErrors] = useState({});

  const update = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.date) newErrors.date = "Discharge date is required.";
    if (!form.reason) newErrors.reason = "Discharge reason is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onDischarge(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <LucideIcon name="UserX" className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Discharge Client
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <LucideIcon name="X" className="w-5 h-5" />
          </button>
        </div>

        {/* Warning */}
        <div className="mx-6 mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-2">
            <LucideIcon
              name="AlertTriangle"
              className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0"
            />
            <div>
              <p className="text-sm font-medium text-orange-800">
                You are about to discharge{" "}
                <span className="font-bold">{client?.clientName}</span>.
              </p>
              <p className="text-xs text-orange-600 mt-1">
                This will mark all active services as inactive and prevent new
                case notes from being created. This action can be reversed by
                reactivating the client.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <InputField
              label="Discharge Date"
              type="date"
              value={form.date}
              onChange={update("date")}
              required
            />
            {errors.date && (
              <p className="text-xs text-red-600 mt-1">{errors.date}</p>
            )}
          </div>

          <div>
            <InputField
              label="Discharge Reason"
              type="select"
              value={form.reason}
              onChange={update("reason")}
              options={DISCHARGE_REASONS}
              placeholder="Select a reason..."
              required
            />
            {errors.reason && (
              <p className="text-xs text-red-600 mt-1">{errors.reason}</p>
            )}
          </div>

          <InputField
            label="Discharge Summary"
            type="textarea"
            value={form.summary}
            onChange={update("summary")}
            placeholder="Optional notes about the discharge..."
            rows={4}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="danger" iconName="UserX" type="submit">
              Discharge Client
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
