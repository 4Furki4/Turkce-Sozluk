import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // Ensure this path is correct
import { schema } from "@/db/index";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP } from "better-auth/plugins";
import nodemailer from "nodemailer";

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
    plugins: [
        nextCookies(),
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                if (type === "sign-in") {
                    try {
                        await transporter.sendMail({
                            from: process.env.EMAIL_FROM,
                            to: email,
                            subject: "Your Login OTP",
                            text: `Your OTP is ${otp}`,
                            html: `<b>Your OTP is ${otp}</b>`
                        });
                    } catch (e) {
                        console.error("Failed to send OTP", e);
                    }
                }
                if (type === "email-verification") {
                    try {
                        await transporter.sendMail({
                            from: process.env.EMAIL_FROM,
                            to: email,
                            subject: "Your Email Verification OTP",
                            text: `Your OTP is ${otp}`,
                            html: `<b>Your OTP is ${otp}</b>`
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
