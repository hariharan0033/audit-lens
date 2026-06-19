const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
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
