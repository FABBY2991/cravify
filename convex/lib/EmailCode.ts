import { Email } from "@convex-dev/auth/providers/Email";
import type { EmailConfig } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { isAdminEmail, randomInt } from "./access";
import { sendEmail } from "./resend";

/**
 * Admin sign-in with a 6-digit code sent by email. Only allowlisted emails
 * are sent a code, so nobody else can create an account or use the site to
 * send mail.
 *
 * Without RESEND_API_KEY the code can be logged instead — but only where
 * LOG_SIGN_IN_CODES=true is set, which is dev alone: Convex hands a
 * function's logs to the client that called it, so a logged code is visible
 * to whoever asked for it. Anywhere else, missing email setup refuses.
 */
export const EmailCode = Email({
  id: "email-code",
  maxAge: 60 * 15,
  generateVerificationToken: async () => String(randomInt(1_000_000)).padStart(6, "0"),
  sendVerificationRequest: async ({
    identifier: email,
    token,
  }: Parameters<EmailConfig["sendVerificationRequest"]>[0]) => {
    if (!isAdminEmail(email)) throw new ConvexError("That email isn't on Cravify's admin list.");
    const sent = await sendEmail({
      to: email,
      subject: "Your Cravify admin code",
      text: `Your code to open the Cravify admin is ${token}. It expires in 15 minutes.\n\nIf you didn't ask for it, you can ignore this email.`,
      html:
        `<div style="font-family:Helvetica,Arial,sans-serif;max-width:460px;margin:0 auto;color:#1d1209">` +
        `<p style="font-size:22px;font-weight:800;color:#e23d28;margin:0 0 12px">Cravify</p>` +
        `<p>Your code to open the admin:</p>` +
        `<p style="font-size:34px;letter-spacing:6px;margin:14px 0;font-weight:700">${token}</p>` +
        `<p style="color:#6b5b4f">It expires in 15 minutes. If you didn't ask for it, you can ignore this email.</p>` +
        `</div>`,
    });
    if (!sent) {
      if (process.env.LOG_SIGN_IN_CODES !== "true") {
        throw new ConvexError("Sign-in email isn't set up on this deployment yet.");
      }
      console.log(`[dev] Cravify admin code for ${email}: ${token}`);
    }
  },
});
