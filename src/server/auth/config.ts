import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import Google from "next-auth/providers/google"
import { db } from "@/db";
import { accounts } from "@/db/schema/accounts";
import { sessions } from "@/db/schema/session";
import { users } from "@/db/schema/users";
import { verificationTokens } from "@/db/schema/verification_tokens";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Nodemailer from "next-auth/providers/nodemailer"
import { createTransport } from "nodemailer"

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
type Role = "user" | "admin" | "moderator";
declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string;
            role: Role;
            username: string;
        } & DefaultSession["user"];
    }
    interface User {
        id?: string;
        role: Role;
        username: string;
    }
}
declare module "next-auth/adapters" {
    export interface AdapterUser {
        role: Role;
    }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
    providers: [
        Google,
        DiscordProvider,
        Nodemailer({
            server: {
                host: process.env.EMAIL_SERVER_HOST,
                port: Number(process.env.EMAIL_SERVER_PORT),
                auth: {
                    user: process.env.EMAIL_SERVER_USER,
                    pass: process.env.EMAIL_SERVER_PASSWORD,
                },
            },
            from: process.env.EMAIL_FROM,
            name: "Email",
            generateVerificationToken: async () => {
                return Math.floor(100000 + Math.random() * 900000).toString();
            },
            sendVerificationRequest: async ({ identifier: email, token, provider }) => {
                const transport = createTransport(provider.server)
                await transport.sendMail({
                    to: email,
                    from: provider.from,
                    subject: `Sign in to Turkish Dictionary`,
                    text: `Sign in code: ${token}\n\nThis code will expire in 10 minutes.`,
                    html: `
<body style="background: #f9f9f9; font-family: Helvetica, Arial, sans-serif; padding: 20px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 10px 0px 20px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: #444;">
        <strong>Turkish Dictionary</strong>
      </td>
    </tr>
  </table>
  <table width="100%" border="0" cellspacing="20" cellpadding="0" style="background: #fff; max-width: 600px; margin: auto; border-radius: 10px;">
    <tr>
      <td align="center" style="padding: 10px 0px 0px 0px; font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: #444;">
        Sign in to <strong>Turkish Dictionary</strong>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="border-radius: 5px;" bgcolor="#a91101">
              <span style="font-size: 24px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 10px 20px; border: 1px solid #a91101; display: inline-block; font-weight: bold;">
                ${token}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: #444;">
        This code will expire in 10 minutes.
      </td>
    </tr>
  </table>
</body>
                    `
                })
            }
        }),
    ],
    callbacks: {
        session: ({ session, user }) => {
            return {
                ...session,
                user: {
                    ...session.user,
                    id: user.id,
                    role: user.role,
                    //todo: add role to the session
                },
            }
        },
        authorized: async ({ auth }) => {
            // Logged in users are authenticated, otherwise redirect to login page
            return !!auth
        },
    },
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }) as any,
    pages: {
        newUser: "/complete-profile",
        signIn: "/signin",
        verifyRequest: "/verify-request",
    },
    theme: {
        brandColor: "#a91101",
        colorScheme: "dark",
        logo: "/logo.svg",

    }
} satisfies NextAuthConfig;
