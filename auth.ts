import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, schema } from "@/app/lib/db";

const resendApiKey = process.env.RESEND_API_KEY ?? "";
const emailFrom = process.env.EMAIL_FROM ?? "noreply@example.com";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    EmailProvider({
      from: emailFrom,
      maxAge: 10 * 60,
      async sendVerificationRequest({ identifier, url }) {
        if (!resend) {
          console.log(`[auth] sign-in link for ${identifier}: ${url}`);
          return;
        }
        const result = await resend.emails.send({
          from: emailFrom,
          to: identifier,
          subject: "Sign in to employeezero",
          html: `<p>Click the secure sign-in link below:</p><p><a href="${url}">Sign in</a></p><p>This link expires in 10 minutes.</p>`,
          text: `Sign in to employeezero:\n${url}\n\nThis link expires in 10 minutes.`,
        });

        if (result.error) {
          throw new Error(`Resend error: ${result.error.message}`);
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
};
