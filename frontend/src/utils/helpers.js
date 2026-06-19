export const SEVERITY_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const STATUSES = ["Resolved", "Unresolved", "Investigating"];

export function severityColor(s) {
  return (
    { LOW: "var(--severity-low)", MEDIUM: "var(--severity-medium)", HIGH: "var(--severity-high)", CRITICAL: "var(--severity-critical)" }[s] ||
    "var(--text-secondary)"
  );
}

export function severityBg(s) {
  return (
    { LOW: "var(--severity-low-bg)", MEDIUM: "var(--severity-medium-bg)", HIGH: "var(--severity-high-bg)", CRITICAL: "var(--severity-critical-bg)" }[s] ||
    "transparent"
  );
}

export function statusColor(s) {
  return (
    { Resolved: "var(--status-resolved)", Unresolved: "var(--status-unresolved)", Investigating: "var(--status-investigating)" }[s] ||
    "var(--text-secondary)"
  );
}

export function formatTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

export function relativeTs(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  return `${day}d ago`;
}

// Generate a deterministic sample data set for demo/testing
export function generateSampleLogs(n = 500) {
  const actors = [
    "priya.nair@company.com", "james.ohara@company.com", "lin.wu@company.com",
    "alex.petrov@company.com", "sara.chen@company.com", "mike.johnson@company.com",
  ];
  const roles = ["admin", "engineer", "analyst", "viewer", "superadmin"];
  const actions = [
    "DELETE_USER", "CREATE_USER", "UPDATE_ROLE", "EXPORT_DATA", "LOGIN",
    "LOGOUT", "VIEW_LOGS", "MODIFY_CONFIG", "RESET_PASSWORD", "REVOKE_TOKEN",
  ];
  const resourceTypes = ["USER", "ROLE", "CONFIG", "REPORT", "SESSION", "TOKEN"];
  const regions = ["ap-south-1", "us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1"];
  const severities = ["LOW", "LOW", "MEDIUM", "MEDIUM", "HIGH", "CRITICAL"];
  const statuses = ["Resolved", "Resolved", "Unresolved", "Unresolved", "Investigating"];

  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randIp = () => `${rand([10,192,172])}.${~~(Math.random()*255)}.${~~(Math.random()*255)}.${~~(Math.random()*255)}`;
  const randDate = () => new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();

  return Array.from({ length: n }, (_, i) => {
    const resourceType = rand(resourceTypes);
    const action = rand(actions);
    return {
      actor: rand(actors),
      role: rand(roles),
      action,
      resource: `/api/${resourceType.toLowerCase()}s/${300 + i}`,
      resourceType,
      ipAddress: randIp(),
      region: rand(regions),
      severity: rand(severities),
      status: rand(statuses),
      timestamp: randDate(),
    };
  });
}
