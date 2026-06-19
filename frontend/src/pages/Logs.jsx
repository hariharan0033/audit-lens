import React, { useState } from "react";
import { useLogs } from "../hooks/useLogs";
import { SeverityBadge, StatusBadge } from "../components/Badges";
import { formatTs, relativeTs, SEVERITY_ORDER, STATUSES } from "../utils/helpers";
import { api } from "../api/client";
import styles from "./Logs.module.css";

const REGIONS = ["ap-south-1", "us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1"];
const RESOURCE_TYPES = ["USER", "ROLE", "CONFIG", "REPORT", "SESSION", "TOKEN"];

const COLUMNS = [
  { key: "timestamp", label: "Timestamp", sortable: true },
  { key: "actor", label: "Actor", sortable: true },
  { key: "role", label: "Role", sortable: true },
  { key: "action", label: "Action", sortable: true },
  { key: "resourceType", label: "Resource Type", sortable: true },
  { key: "region", label: "Region", sortable: true },
  { key: "severity", label: "Severity", sortable: true },
  { key: "status", label: "Status", sortable: true },
];

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

        <Select
          value={params.severity}
          onChange={(v) => setFilter("severity", v)}
          options={SEVERITY_ORDER}
          placeholder="Severity"
        />
        <Select
          value={params.status}
          onChange={(v) => setFilter("status", v)}
          options={STATUSES}
          placeholder="Status"
        />
        <Select
          value={params.region}
          onChange={(v) => setFilter("region", v)}
          options={REGIONS}
          placeholder="Region"
        />
        <Select
          value={params.resourceType}
          onChange={(v) => setFilter("resourceType", v)}
          options={RESOURCE_TYPES}
          placeholder="Resource type"
        />

        <input
          className={styles.dateInput}
          type="date"
          title="From date"
          value={params.from ? params.from.slice(0, 10) : ""}
          onChange={(e) => setFilter("from", e.target.value ? e.target.value + "T00:00:00Z" : "")}
        />
        <input
          className={styles.dateInput}
          type="date"
          title="To date"
          value={params.to ? params.to.slice(0, 10) : ""}
          onChange={(e) => setFilter("to", e.target.value ? e.target.value + "T23:59:59Z" : "")}
        />
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {loading && <div className={styles.loadingBar} />}
        {error && <div className={styles.error}>{error}</div>}

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
                  No logs match the current filters.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr
                key={log._id}
                className={`${styles.row} ${selected?._id === log._id ? styles.rowActive : ""}`}
                onClick={() => setSelected(selected?._id === log._id ? null : log)}
              >
                <td className={`${styles.td} ${styles.tdMono}`} title={log.timestamp}>
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

          <select
            className={styles.limitSelect}
            value={params.limit}
            onChange={(e) => setFilter("limit", Number(e.target.value))}
          >
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
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
                    {k === "severity" ? <SeverityBadge value={v} />
                      : k === "status" ? <StatusBadge value={v} />
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

function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      className={styles.filterSelect}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
