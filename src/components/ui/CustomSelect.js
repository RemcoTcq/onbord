"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function CustomSelect({ value, onChange, options, placeholder }) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="ds-input"
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left",
          borderColor: isOpen ? "var(--ds-blue)" : undefined,
          boxShadow: isOpen ? "0 0 0 3px var(--ds-blue-10)" : undefined,
        }}
      >
        <span style={{ color: selectedOption ? "var(--ds-ink)" : "var(--ds-ink-5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          style={{
            flex: "none",
            color: isOpen ? "var(--ds-blue)" : "var(--ds-ink-4)",
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
          }}
        />
      </button>

      {isOpen && (
        <div role="listbox" className="ds-menu" style={{ left: 0, right: 0, top: "calc(100% + 6px)", maxHeight: 280, overflowY: "auto" }}>
          {options.length === 0 && (
            <div className="ds-muted" style={{ padding: "8px 12px", fontSize: 13, textAlign: "center" }}>
              {t("common.actions.noOption")}
            </div>
          )}
          {options.map((opt) => {
            const actif = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={actif}
                className="ds-menu-item"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  height: "auto", minHeight: 36, padding: "8px 10px", justifyContent: "space-between",
                  background: actif ? "var(--ds-blue-06)" : undefined,
                  color: actif ? "var(--ds-blue)" : undefined,
                  fontWeight: actif ? 500 : 400,
                }}
              >
                <span>{opt.label}</span>
                {actif && <span className="ds-dot ds-dot-blue" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
