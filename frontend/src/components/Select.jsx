import React, { useState, useRef, useEffect } from "react";
import styles from "./Select.module.css";

/**
 * Custom styled dropdown — matches the app's dark/light theme.
 * Props:
 *   value        – current value (string)
 *   onChange     – (value: string) => void
 *   options      – string[] or { label, value }[]
 *   placeholder  – shown when value is empty
 *   className    – extra class on the trigger
 */
export default function Select({ value, onChange, options, placeholder = "Select…", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Normalise options to { label, value }
  const items = options.map((o) =>
    typeof o === "string" ? { label: o, value: o } : o
  );

  const selected = items.find((i) => i.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Keyboard nav
  function handleKeyDown(e) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); return; }
    if (!open) return;
    const idx = items.findIndex((i) => i.value === value);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = items[(idx + 1) % items.length];
      onChange(next.value);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = items[(idx - 1 + items.length) % items.length];
      onChange(prev.value);
    }
  }

  function pick(v) {
    onChange(v === value ? "" : v); // click same = clear
    setOpen(false);
  }

  return (
    <div ref={ref} className={`${styles.wrap} ${className}`}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""} ${value ? styles.hasValue : ""}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.triggerLabel}>
          {selected ? selected.label : <span className={styles.placeholder}>{placeholder}</span>}
        </span>
        <span className={`${styles.chevron} ${open ? styles.chevronUp : ""}`}>▾</span>
      </button>

      {open && (
        <ul className={styles.menu} role="listbox">
          {/* Clear option */}
          <li
            className={`${styles.option} ${!value ? styles.optionActive : ""}`}
            role="option"
            aria-selected={!value}
            onMouseDown={() => pick("")}
          >
            <span className={styles.optionDot} />
            {placeholder}
          </li>
          {items.map((item) => (
            <li
              key={item.value}
              className={`${styles.option} ${value === item.value ? styles.optionActive : ""}`}
              role="option"
              aria-selected={value === item.value}
              onMouseDown={() => pick(item.value)}
            >
              <span
                className={styles.optionDot}
                style={item.color ? { background: item.color, opacity: 1 } : {}}
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
