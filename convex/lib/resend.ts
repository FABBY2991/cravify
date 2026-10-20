import { ConvexError } from "convex/values";

/**
 * Sends one email through Resend.
 *
 * Returns false, sending nothing, when RESEND_API_KEY is unset — a dev
 * deployment's state, where callers log instead. Throws on a refused send:
 * Resend answers 200 with an `{ id }` on success, and anything else (401 bad
 * key, 403 unverified domain, 422 bad payload) must surface rather than
 * silently deliver nothing.
 */
export async function sendEmail(message: { to: string; subject: string; text: string; html?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.RESEND_FROM;
  if (!from) {
    throw new ConvexError(
      'RESEND_FROM is not set — e.g. `npx convex env set RESEND_FROM "Cravify <no-reply@yourdomain>"`',
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
  });
  if (!response.ok) {
    // The status is enough to diagnose; Resend's body can echo the address.
    console.error(`Resend send failed with status ${response.status}`);
    throw new ConvexError("The sign-in email couldn't be sent. Try again in a minute.");
  }
  return true;
}
