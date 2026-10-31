/**
 * Admin gate for /dashboard.
 * Set ADMIN_USER_IDS to a comma-separated list of Clerk user IDs.
 * If unset, any signed-in user can open the dashboard (handy for local/demo).
 */
export function isAdminUserId(userId: string): boolean {
  const raw = process.env.ADMIN_USER_IDS?.trim();
  if (!raw) return true;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(userId);
}

export function adminGateOpen(): boolean {
  return !process.env.ADMIN_USER_IDS?.trim();
}
