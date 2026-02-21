import React, { useEffect } from "react";
import { LucideIcon } from "./LucideIcon";

export const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-green-50 border-green-300 text-green-700",
    error: "bg-red-50 border-red-300 text-red-700",
    info: "bg-blue-50 border-blue-300 text-blue-700",
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${colors[type]} border rounded-lg px-4 py-3 shadow-lg animate-fadeIn flex items-center gap-2`}>
      <LucideIcon name={type === "success" ? "CheckCircle2" : type === "error" ? "XCircle" : "Info"} className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100">
        <LucideIcon name="X" className="w-4 h-4" />
      </button>
    </div>
  );
};
