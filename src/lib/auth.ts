import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // Ensure this path is correct
import { schema } from "@/db/index";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP } from "better-auth/plugins";
import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import OtpEmail from "@/src/emails/otp-email";
import { cookies } from "next/headers";

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
    auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
    },
});

export const auth = betterAuth({
    user: {
        additionalFields: {
            username: { type: "string", required: true, unique: true }
        }
    },
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.users,
            account: schema.accounts,
            session: schema.sessions,
            verification: schema.verification,
        },
    }),
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
    },
    socialProviders: {
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID || process.env.AUTH_DISCORD_ID || "",
            clientSecret: process.env.DISCORD_CLIENT_SECRET || process.env.AUTH_DISCORD_SECRET || "",
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "",
        },
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // Cache duration in seconds
        }
    },
    plugins: [
        nextCookies(),
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                if (type === "sign-in" || type === "email-verification") {
                    try {
                        const cookieStore = await cookies();
                        const locale = cookieStore.get("NEXT_LOCALE")?.value || "tr";
                        const view = await render(OtpEmail({ validationCode: otp, locale }));

                        let subject = "";
                        if (locale === "tr") {
                            subject = type === "sign-in" ? "Giriş Kodunuz - Türkçe Sözlük" : "E-posta Doğrulama - Türkçe Sözlük";
                        } else {
                            subject = type === "sign-in" ? "Your Login Code - Turkish Dictionary" : "Email Verification - Turkish Dictionary";
                        }

                        await transporter.sendMail({
                            from: process.env.EMAIL_FROM,
                            to: email,
                            subject,
                            text: `Your OTP is ${otp}`,
                            html: view
                        });
                    } catch (e) {
                        console.error("Failed to send OTP", e);
                    }
                }
            },
        }),
        admin()
    ]
});

export type Session = typeof auth.$Infer.Session
export type User = Session["user"]
