import React, { useState, useRef, useEffect } from "react";
import { api } from "../api/client";
import { generateSampleLogs } from "../utils/helpers";
import styles from "./Upload.module.css";

export default function Upload() {
  const [file, setFile]       = useState(null);
  const [status, setStatus]   = useState(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [dbInfo, setDbInfo]   = useState(null);
  const inputRef = useRef(null);

  // Fetch debug info on mount so user can see what's in the DB
  useEffect(() => {
    fetch("/api/debug")
      .then((r) => r.json())
      .then(setDbInfo)
      .catch(() => {}); // non-critical
  }, [status]); // refresh after any upload/delete action

  function handleFile(f) {
    if (!f) return;
    if (!f.name.endsWith(".json")) {
      setStatus({ type: "error", msg: "Only .json files are accepted." });
      return;
    }
    setFile(f);
    setStatus(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!Array.isArray(parsed)) throw new Error("JSON must be an array of log records.");
        if (parsed.length > 10000) throw new Error("Maximum 10,000 records per upload.");
        setPreview({ count: parsed.length, sample: parsed[0] });
      } catch (err) {
        setPreview(null);
        setStatus({ type: "error", msg: err.message });
      }
    };
    reader.readAsText(f);
  }

  async function handleUpload() {
    if (!file) return;
    setStatus({ type: "loading", msg: "Uploading…" });
    try {
      const text    = await file.text();
      const records = JSON.parse(text);
      const result  = await api.uploadLogs(records);
      setStatus({ type: "success", msg: result.message });
      setFile(null);
      setPreview(null);
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    }
  }

  async function handleSampleUpload(n) {
    setStatus({ type: "loading", msg: `Generating and uploading ${n.toLocaleString()} sample records…` });
    try {
      const records = generateSampleLogs(n);
      const result  = await api.uploadLogs(records);
      setStatus({ type: "success", msg: result.message });
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    }
  }

  async function handleClearAll() {
    if (!confirm("Delete ALL stored logs? This cannot be undone.")) return;
    setStatus({ type: "loading", msg: "Deleting all logs…" });
    try {
      const r = await api.deleteAllLogs();
      setStatus({ type: "success", msg: r.message });
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    }
  }

  async function handleReseed(n) {
    if (!confirm(`This will delete all existing logs and insert ${n.toLocaleString()} fresh records with recent timestamps. Continue?`)) return;
    setStatus({ type: "loading", msg: "Clearing old data…" });
    try {
      await api.deleteAllLogs();
      setStatus({ type: "loading", msg: `Inserting ${n.toLocaleString()} fresh records…` });
      const records = generateSampleLogs(n);
      const result  = await api.uploadLogs(records);
      setStatus({ type: "success", msg: `Reseeded — ${result.message}` });
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    }
  }

  async function handleFixTimestamps() {
    setStatus({ type: "loading", msg: "Scanning for string timestamps…" });
    try {
      const r = await fetch("/api/debug/fix-timestamps", { method: "POST" });
      const data = await r.json();
      setStatus({ type: "success", msg: data.message });
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    }
  }

  const isLoading = status?.type === "loading";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Upload Logs</h1>
        <p className={styles.subtitle}>Upload a JSON array of up to 10,000 audit log records.</p>
      </header>

      {/* DB snapshot */}
      {dbInfo && (
        <div className={styles.dbInfo}>
          <span className={styles.dbInfoLabel}>Current DB</span>
          <span className={styles.dbInfoStat}>
            <strong>{dbInfo.total.toLocaleString()}</strong> records
          </span>
          {dbInfo.total > 0 && (
            <>
              <span className={styles.dbInfoDivider}>·</span>
              <span className={styles.dbInfoStat}>
                Newest: <code>{dbInfo.newest5?.[0]?.ts ? new Date(dbInfo.newest5[0].ts).toLocaleDateString() : "—"}</code>
              </span>
              <span className={styles.dbInfoDivider}>·</span>
              <span className={styles.dbInfoStat}>
                Oldest: <code>{dbInfo.oldest5?.[0]?.ts ? new Date(dbInfo.oldest5[0].ts).toLocaleDateString() : "—"}</code>
              </span>
              <span className={styles.dbInfoDivider}>·</span>
              <span className={`${styles.dbInfoStat} ${dbInfo.inLast7Days === 0 ? styles.dbWarn : styles.dbOk}`}>
                {dbInfo.inLast7Days.toLocaleString()} in last 7 days
                {dbInfo.inLast7Days === 0 && " ⚠ reseed for chart data"}
              </span>
            </>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`${styles.dropzone} ${dragging ? styles.dragging : ""} ${file ? styles.hasFile : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".json" className={styles.hidden}
          onChange={(e) => handleFile(e.target.files[0])} />
        {file ? (
          <div className={styles.fileInfo}>
            <span className={styles.fileIcon}>▣</span>
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
          </div>
        ) : (
          <>
            <div className={styles.dropIcon}>↑</div>
            <p className={styles.dropText}>Drop a <code>.json</code> file here, or click to browse</p>
            <p className={styles.dropHint}>Array of 1–10,000 audit log records</p>
          </>
        )}
      </div>

      {preview && (
        <div className={styles.preview}>
          <div className={styles.previewMeta}>
            <span className={styles.previewCount}>{preview.count.toLocaleString()} records ready</span>
          </div>
          <pre className={styles.previewJson}>{JSON.stringify(preview.sample, null, 2)}</pre>
          <p className={styles.previewHint}>↑ Sample of first record</p>
        </div>
      )}

      {status && (
        <div className={`${styles.status} ${styles[`status_${status.type}`]}`}>
          {status.type === "loading" && <span className={styles.spinner}>⟳</span>}
          {status.msg}
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.uploadBtn} onClick={handleUpload}
          disabled={!file || isLoading || !preview}>
          Upload file
        </button>
      </div>

      {/* Quick tools */}
      <div className={styles.tools}>
        <h2 className={styles.toolsTitle}>Quick Tools</h2>
        <div className={styles.toolGrid}>

          <div className={styles.tool}>
            <div className={styles.toolLabel}>Add sample data</div>
            <div className={styles.toolDesc}>
              Generate records with timestamps biased toward the last 7 days and append to existing data.
            </div>
            <div className={styles.toolActions}>
              {[500, 2000, 10000].map((n) => (
                <button key={n} className={styles.toolBtn} onClick={() => handleSampleUpload(n)} disabled={isLoading}>
                  {n.toLocaleString()} records
                </button>
              ))}
            </div>
          </div>

          <div className={styles.tool}>
            <div className={styles.toolLabel}>Reseed database</div>
            <div className={styles.toolDesc}>
              Wipes all existing data and inserts fresh records. Use this if the 7-day chart is empty
              because your existing data is too old.
            </div>
            <div className={styles.toolActions}>
              {[500, 2000, 10000].map((n) => (
                <button key={n} className={`${styles.toolBtn} ${styles.toolBtnWarn}`}
                  onClick={() => handleReseed(n)} disabled={isLoading}>
                  Reseed {n.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.tool}>
            <div className={styles.toolLabel}>Fix timestamp types</div>
            <div className={styles.toolDesc}>
              If the 7-day chart is empty or date filters return nothing, your existing records
              may have timestamps stored as strings instead of dates. This repairs them in-place.
            </div>
            <div className={styles.toolActions}>
              <button className={`${styles.toolBtn} ${styles.toolBtnWarn}`}
                onClick={handleFixTimestamps} disabled={isLoading}>
                Fix timestamps
              </button>
            </div>
          </div>

          <div className={styles.tool}>
            <div className={styles.toolLabel}>Reset database</div>
            <div className={styles.toolDesc}>Remove all stored log records. Use with care.</div>
            <div className={styles.toolActions}>
              <button className={`${styles.toolBtn} ${styles.toolBtnDanger}`}
                onClick={handleClearAll} disabled={isLoading}>
                Delete all logs
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Schema */}
      <div className={styles.schema}>
        <h2 className={styles.schemaTitle}>Expected Schema</h2>
        <pre className={styles.schemaCode}>{JSON.stringify([{
          actor: "priya.nair@company.com",
          role: "admin",
          action: "DELETE_USER",
          resource: "/api/users/334",
          resourceType: "USER",
          ipAddress: "192.168.1.45",
          region: "ap-south-1",
          severity: "HIGH",
          status: "Unresolved",
          timestamp: "2025-06-14T08:32:11Z",
        }], null, 2)}</pre>
      </div>
    </div>
  );
}
