const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch (networkErr) {
    throw new Error("Network error — could not reach the server. Check your connection.");
  }

  // Try to parse JSON; handle empty or non-JSON bodies gracefully
  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const text = await res.text();
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        // Server sent malformed JSON
        if (!res.ok) throw new Error(`Server error (${res.status}) — invalid response format.`);
        // 2xx but broken JSON — return null so callers get empty-safe defaults
        return null;
      }
    }
    // Empty body on a 2xx (e.g. 204 No Content) — fine, return null
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

export const api = {
  // Logs
  getLogs: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined)
    ).toString();
    return request(`/logs${qs ? `?${qs}` : ""}`);
  },

  getLog: (id) => request(`/logs/${id}`),

  uploadLogs: (records) =>
    request("/logs/upload", {
      method: "POST",
      body: JSON.stringify(records),
    }),

  deleteLog: (id) =>
    request(`/logs/${id}`, { method: "DELETE" }),

  deleteAllLogs: () =>
    request("/logs", { method: "DELETE" }),

  // Stats
  getStats: () => request("/stats"),
};
