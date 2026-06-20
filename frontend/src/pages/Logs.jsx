import React, { useState } from "react";
import { useLogs } from "../hooks/useLogs";
import { SeverityBadge, StatusBadge } from "../components/Badges";
import CustomSelect from "../components/Select";
import { formatTs, relativeTs } from "../utils/helpers";
import { api } from "../api/client";
import styles from "./Logs.module.css";

const REGIONS = ["ap-south-1", "us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1"];
const RESOURCE_TYPES = ["USER", "ROLE", "CONFIG", "REPORT", "SESSION", "TOKEN"];

const SEVERITY_OPTIONS = [
  { label: "Low",      value: "LOW",      color: "var(--severity-low)" },
  { label: "Medium",   value: "MEDIUM",   color: "var(--severity-medium)" },
  { label: "High",     value: "HIGH",     color: "var(--severity-high)" },
  { label: "Critical", value: "CRITICAL", color: "var(--severity-critical)" },
];

const STATUS_OPTIONS = [
  { label: "Resolved",      value: "Resolved",      color: "var(--status-resolved)" },
  { label: "Unresolved",    value: "Unresolved",    color: "var(--status-unresolved)" },
  { label: "Investigating", value: "Investigating", color: "var(--status-investigating)" },
];

const COLUMNS = [
  { key: "timestamp",    label: "Timestamp",     sortable: true },
  { key: "actor",        label: "Actor",         sortable: true },
  { key: "role",         label: "Role",          sortable: true },
  { key: "action",       label: "Action",        sortable: true },
  { key: "resourceType", label: "Resource Type", sortable: true },
  { key: "region",       label: "Region",        sortable: true },
  { key: "severity",     label: "Severity",      sortable: true },
  { key: "status",       label: "Status",        sortable: true },
];

/**
 * Convert a "YYYY-MM-DD" string from <input type="date"> to an ISO timestamp.
 * The browser gives us the date in LOCAL time, so we parse it as local midnight /
 * local end-of-day — not UTC — to match what the user sees on their calendar.
 */
function localDateToFromISO(val) {
  if (!val) return "";
  // Parse as local midnight
  const [y, m, d] = val.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt.toISOString(); // converted to UTC by JS
}

function localDateToToISO(val) {
  if (!val) return "";
  const [y, m, d] = val.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
  return dt.toISOString();
}

export default function Logs() {
  const {
    logs, pagination, params, loading, error,
    setFilter, setSort, setPage, resetFilters, refresh,
  } = useLogs();

  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function handleSort(key) {
    if (params.sortBy === key) {
      setSort(key, params.sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSort(key, "desc");
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this log entry?")) return;
    setDeleting(id);
    try {
      await api.deleteLog(id);
      if (selected?._id === id) setSelected(null);
      refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  }

  // Extract the YYYY-MM-DD portion in LOCAL time from the stored ISO string
  function isoToLocalDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const activeFilters = Object.entries(params).filter(
    ([k, v]) => !["page", "limit", "sortBy", "sortOrder"].includes(k) && v !== ""
  ).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Audit Logs</h1>
          {pagination && (
            <p className={styles.count}>
              {pagination.total.toLocaleString()} records
              {activeFilters > 0 && ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""} active`}
            </p>
          )}
        </div>
        {activeFilters > 0 && (
          <button className={styles.resetBtn} onClick={resetFilters}>
            Clear filters
          </button>
        )}
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search actor, action, resource, IP…"
          value={params.search}
          onChange={(e) => setFilter("search", e.target.value)}
        />

        <CustomSelect
          value={params.severity}
          onChange={(v) => setFilter("severity", v)}
          options={SEVERITY_OPTIONS}
          placeholder="Severity"
        />
        <CustomSelect
          value={params.status}
          onChange={(v) => setFilter("status", v)}
          options={STATUS_OPTIONS}
          placeholder="Status"
        />
        <CustomSelect
          value={params.region}
          onChange={(v) => setFilter("region", v)}
          options={REGIONS}
          placeholder="Region"
        />
        <CustomSelect
          value={params.resourceType}
          onChange={(v) => setFilter("resourceType", v)}
          options={RESOURCE_TYPES}
          placeholder="Resource type"
        />

        {/* Date range — local-aware */}
        <div className={styles.dateWrap}>
          <span className={styles.dateLabel}>From</span>
          <input
            className={styles.dateInput}
            type="date"
            value={isoToLocalDate(params.from)}
            onChange={(e) => setFilter("from", localDateToFromISO(e.target.value))}
          />
        </div>
        <div className={styles.dateWrap}>
          <span className={styles.dateLabel}>To</span>
          <input
            className={styles.dateInput}
            type="date"
            value={isoToLocalDate(params.to)}
            onChange={(e) => setFilter("to", localDateToToISO(e.target.value))}
          />
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {loading && <div className={styles.loadingBar} />}
        {error && <div className={styles.error}>⚠ {error}</div>}

        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map(({ key, label, sortable }) => (
                <th
                  key={key}
                  className={`${styles.th} ${sortable ? styles.sortable : ""} ${params.sortBy === key ? styles.sorted : ""}`}
                  onClick={sortable ? () => handleSort(key) : undefined}
                >
                  {label}
                  {sortable && params.sortBy === key && (
                    <span className={styles.sortArrow}>
                      {params.sortOrder === "asc" ? " ↑" : " ↓"}
                    </span>
                  )}
                </th>
              ))}
              <th className={styles.th} />
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className={styles.empty}>
                  {error ? "Could not load logs." : "No logs match the current filters."}
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr
                key={log._id}
                className={`${styles.row} ${selected?._id === log._id ? styles.rowActive : ""}`}
                onClick={() => setSelected(selected?._id === log._id ? null : log)}
              >
                <td className={`${styles.td} ${styles.tdMono}`} title={formatTs(log.timestamp)}>
                  {relativeTs(log.timestamp)}
                </td>
                <td className={`${styles.td} ${styles.tdMono}`}>{log.actor}</td>
                <td className={`${styles.td} ${styles.tdRole}`}>{log.role}</td>
                <td className={`${styles.td} ${styles.tdAction}`}>{log.action}</td>
                <td className={styles.td}>{log.resourceType}</td>
                <td className={`${styles.td} ${styles.tdMono}`}>{log.region}</td>
                <td className={styles.td}><SeverityBadge value={log.severity} /></td>
                <td className={styles.td}><StatusBadge value={log.status} /></td>
                <td className={styles.td}>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => handleDelete(log._id, e)}
                    disabled={deleting === log._id}
                    title="Delete log"
                  >
                    {deleting === log._id ? "…" : "×"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={!pagination.hasPrev}
            onClick={() => setPage(params.page - 1)}
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={!pagination.hasNext}
            onClick={() => setPage(params.page + 1)}
          >
            Next →
          </button>

          <CustomSelect
            value={String(params.limit)}
            onChange={(v) => setFilter("limit", Number(v))}
            options={[
              { label: "25 per page",  value: "25" },
              { label: "50 per page",  value: "50" },
              { label: "100 per page", value: "100" },
              { label: "200 per page", value: "200" },
            ]}
            placeholder="Per page"
          />
        </div>
      )}

      {/* Log detail panel */}
      {selected && (
        <div className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <span className={styles.detailTitle}>Log Detail</span>
            <button className={styles.closeBtn} onClick={() => setSelected(null)}>×</button>
          </div>
          <div className={styles.detailBody}>
            {Object.entries(selected)
              .filter(([k]) => k !== "__v")
              .map(([k, v]) => (
                <div key={k} className={styles.detailRow}>
                  <span className={styles.detailKey}>{k}</span>
                  <span className={styles.detailVal}>
                    {k === "severity"   ? <SeverityBadge value={v} />
                    : k === "status"    ? <StatusBadge value={v} />
                    : k === "timestamp" ? formatTs(v)
                    : String(v)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
