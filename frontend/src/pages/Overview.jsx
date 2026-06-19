import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { api } from "../api/client";
import styles from "./Overview.module.css";

const SEVERITY_COLORS = {
  LOW: "#4ade80", MEDIUM: "#facc15", HIGH: "#fb923c", CRITICAL: "#f43f5e",
};

const STAT_CARDS = (s) => [
  { label: "Total Logs", value: s.total?.toLocaleString() ?? "—", accent: "var(--accent-cyan)" },
  { label: "Critical", value: (s.bySeverity?.CRITICAL ?? 0).toLocaleString(), accent: "#f43f5e" },
  { label: "High", value: (s.bySeverity?.HIGH ?? 0).toLocaleString(), accent: "#fb923c" },
  { label: "Unresolved", value: (s.byStatus?.Unresolved ?? 0).toLocaleString(), accent: "#f43f5e" },
  { label: "Investigating", value: (s.byStatus?.Investigating ?? 0).toLocaleString(), accent: "#facc15" },
  { label: "Resolved", value: (s.byStatus?.Resolved ?? 0).toLocaleString(), accent: "#4ade80" },
];

export default function Overview() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Loading overview…</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  const severityPie = Object.entries(stats.bySeverity || {}).map(([name, value]) => ({
    name, value,
  }));

  const activityData = (stats.recentActivity || []).map((d) => ({
    date: d._id.slice(5), // MM-DD
    total: d.count,
    high: d.high,
    critical: d.critical,
  }));

  const topActions = (stats.topActions || []).map((a) => ({
    name: a._id,
    count: a.count,
  }));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.subtitle}>Security event summary across all regions</p>
        </div>
        <Link to="/logs" className={styles.viewAll}>View all logs →</Link>
      </header>

      {/* Stat Cards */}
      <div className={styles.cards}>
        {STAT_CARDS(stats).map(({ label, value, accent }) => (
          <div key={label} className={styles.card}>
            <div className={styles.cardValue} style={{ color: accent }}>{value}</div>
            <div className={styles.cardLabel}>{label}</div>
          </div>
        ))}
      </div>

      <div className={styles.charts}>
        {/* Activity trend */}
        <div className={styles.chartBox}>
          <h2 className={styles.chartTitle}>7-Day Activity</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }} labelStyle={{ color: "var(--text-secondary)" }} />
              <Line type="monotone" dataKey="total" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="high" stroke="#fb923c" strokeWidth={1.5} dot={false} name="High" />
              <Line type="monotone" dataKey="critical" stroke="#f43f5e" strokeWidth={1.5} dot={false} name="Critical" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Severity distribution */}
        <div className={styles.chartBox}>
          <h2 className={styles.chartTitle}>Severity Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={severityPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                {severityPie.map((entry) => (
                  <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || "#555"} />
                ))}
              </Pie>
              <Legend
                formatter={(v) => <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{v}</span>}
              />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top actions */}
        <div className={styles.chartBox}>
          <h2 className={styles.chartTitle}>Most Frequent Actions</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topActions} layout="vertical">
              <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fill: "var(--text-secondary)", fontSize: 11, fontFamily: "var(--font-mono)" }} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="count" fill="var(--accent-cyan)" radius={[0, 4, 4, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Region breakdown */}
        <div className={styles.chartBox}>
          <h2 className={styles.chartTitle}>Events by Region</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.byRegion || []}>
              <XAxis dataKey="_id" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top actors */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Most Active Actors</h2>
        <div className={styles.actorList}>
          {(stats.topActors || []).map((a, i) => (
            <div key={a._id} className={styles.actorRow}>
              <span className={styles.actorRank}>#{i + 1}</span>
              <span className={styles.actorName}>{a._id}</span>
              <span className={styles.actorCount}>{a.count.toLocaleString()} events</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
