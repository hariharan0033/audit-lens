import React, { useState, useRef } from "react";
import { api } from "../api/client";
import { generateSampleLogs } from "../utils/helpers";
import styles from "./Upload.module.css";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null); // { type: "success"|"error"|"loading", msg }
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

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
        setStatus(null);
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
      const text = await file.text();
      const records = JSON.parse(text);
      const result = await api.uploadLogs(records);
      setStatus({ type: "success", msg: result.message });
      setFile(null);
      setPreview(null);
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    }
  }

  async function handleSampleUpload(n) {
    setStatus({ type: "loading", msg: `Generating and uploading ${n} sample records…` });
    try {
      const records = generateSampleLogs(n);
      const result = await api.uploadLogs(records);
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Upload Logs</h1>
        <p className={styles.subtitle}>
          Upload a JSON array of up to 10,000 audit log records.
        </p>
      </header>

      {/* Drop zone */}
      <div
        className={`${styles.dropzone} ${dragging ? styles.dragging : ""} ${file ? styles.hasFile : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        aria-label="Upload JSON file"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          className={styles.hidden}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {file ? (
          <div className={styles.fileInfo}>
            <span className={styles.fileIcon}>▣</span>
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.fileSize}>
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
        ) : (
          <>
            <div className={styles.dropIcon}>↑</div>
            <p className={styles.dropText}>Drop a <code>.json</code> file here, or click to browse</p>
            <p className={styles.dropHint}>Array of 1–10,000 audit log records</p>
          </>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className={styles.preview}>
          <div className={styles.previewMeta}>
            <span className={styles.previewCount}>{preview.count.toLocaleString()} records ready</span>
          </div>
          <pre className={styles.previewJson}>
            {JSON.stringify(preview.sample, null, 2)}
          </pre>
          <p className={styles.previewHint}>↑ Sample of first record</p>
        </div>
      )}

      {/* Status */}
      {status && (
        <div className={`${styles.status} ${styles[`status_${status.type}`]}`}>
          {status.type === "loading" && <span className={styles.spinner}>⟳</span>}
          {status.msg}
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.uploadBtn}
          onClick={handleUpload}
          disabled={!file || status?.type === "loading" || !preview}
        >
          Upload file
        </button>
      </div>

      {/* Quick tools */}
      <div className={styles.tools}>
        <h2 className={styles.toolsTitle}>Quick Tools</h2>
        <div className={styles.toolGrid}>
          <div className={styles.tool}>
            <div className={styles.toolLabel}>Load sample data</div>
            <div className={styles.toolDesc}>Generate realistic test records and upload them immediately.</div>
            <div className={styles.toolActions}>
              <button className={styles.toolBtn} onClick={() => handleSampleUpload(500)} disabled={status?.type === "loading"}>500 records</button>
              <button className={styles.toolBtn} onClick={() => handleSampleUpload(2000)} disabled={status?.type === "loading"}>2,000 records</button>
              <button className={styles.toolBtn} onClick={() => handleSampleUpload(10000)} disabled={status?.type === "loading"}>10,000 records</button>
            </div>
          </div>

          <div className={styles.tool}>
            <div className={styles.toolLabel}>Reset database</div>
            <div className={styles.toolDesc}>Remove all stored log records. Use with care.</div>
            <div className={styles.toolActions}>
              <button className={`${styles.toolBtn} ${styles.toolBtnDanger}`} onClick={handleClearAll} disabled={status?.type === "loading"}>
                Delete all logs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Schema reference */}
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
