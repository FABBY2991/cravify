# 4. Admins sign in with emailed codes, from an allowlist

`/admin` uses Convex Auth with a 6-digit emailed code (Resend), as in MEMORA.
Only addresses on the `ADMIN_EMAILS` environment variable are ever sent a
code, and every admin function re-checks the allowlist on the backend.

Codes may be written to the log instead of emailed only where
`LOG_SIGN_IN_CODES=true` is set (dev). Convex hands a function's logs back to
the client that called it, so logging a code anywhere else would show it to
whoever asked for it; without email set up, production refuses to sign in.
