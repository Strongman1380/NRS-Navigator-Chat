import React from "react";

export const InputField = ({ label, type = "text", value, onChange, options, placeholder, required, rows, className = "", disabled }) => {
  const baseInput = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-all duration-200 bg-white";

  if (type === "select") {
    return (
      <div className={className}>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
        <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={baseInput + " cursor-pointer"} disabled={disabled}>
          <option value="">{placeholder || "Select..."}</option>
          {(options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div className={className}>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
        <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={rows || 4} placeholder={placeholder} className={baseInput + " resize-y"} disabled={disabled} />
      </div>
    );
  }

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={baseInput} required={required} disabled={disabled} />
    </div>
  );
};
