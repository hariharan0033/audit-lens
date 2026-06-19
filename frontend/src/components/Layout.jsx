import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import styles from "./Layout.module.css";

const NAV = [
  { to: "/", label: "Overview", icon: "⬡" },
  { to: "/logs", label: "Logs", icon: "≡" },
  { to: "/upload", label: "Upload", icon: "↑" },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>▣</span>
          {!collapsed && <span className={styles.logoText}>AuditLens</span>}
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ""}`
              }
            >
              <span className={styles.navIcon}>{icon}</span>
              {!collapsed && <span className={styles.navLabel}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "→" : "←"}
        </button>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
