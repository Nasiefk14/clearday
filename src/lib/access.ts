/** Is this Google email on the ALLOWED_EMAILS list? Re-checked on every request, so removing an email revokes access. */
export function isAllowed(email: string | null | undefined, list = process.env.ALLOWED_EMAILS ?? ""): boolean {
  if (!email) return false;
  const allowed = list.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
