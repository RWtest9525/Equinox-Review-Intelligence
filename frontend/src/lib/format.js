export function timeAgo(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

export function fmtNum(n) {
  if (n == null) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toString();
}

export function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const PLATFORM_LABEL = {
  google_play: "Google Play",
  app_store: "App Store",
  both: "All Platforms",
};

export const ROLE_LABEL = {
  super_admin: "Super Admin",
  client_admin: "Client Admin",
  client_member: "Client Member",
};
