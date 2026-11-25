# Security

Clearday stores people's personal debt information, so security reports are taken seriously.

## Reporting a vulnerability

Please **don't open a public issue**. Report it privately through GitHub's
[private vulnerability reporting](../../security/advisories/new) on this repository.
You'll get a reply within a few days.

## How data is protected

- Sign-in is Google OAuth only. There are no passwords, and new accounts need an invite (`ALLOWED_EMAILS`).
- Sessions are stored server-side and can be revoked.
- Every database query is scoped to the signed-in user in one data layer (`src/lib/data.ts`), and an
  integration test checks that one user can't read or change another user's data.
- All form input is validated on the server with Zod.
- No bank connections and no third-party analytics.
