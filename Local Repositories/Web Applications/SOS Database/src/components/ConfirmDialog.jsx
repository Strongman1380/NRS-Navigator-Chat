import React from "react";
import { Button } from "./Button";

export const ConfirmDialog = ({ title, message, onConfirm, onCancel, confirmLabel = "Delete", confirmVariant = "danger" }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full animate-scaleIn" onClick={(e) => e.stopPropagation()}>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  </div>
);
