import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // Ensure this path is correct
import { schema } from "@/db/index";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import { render } from "@react-email/render";
import OtpEmail from "@/src/emails/otp-email";
import { cookies } from "next/headers";

const authBaseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
const trustedOrigins = [
    authBaseUrl,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_URL,
].filter((origin): origin is string => Boolean(origin));

const resendEmailFrom = process.env.RESEND_EMAIL_FROM || "Türkçe Sözlük <no-reply@turkce-sozluk.com>";

function getOtpEmailSubject(type: "sign-in" | "email-verification" | "forget-password", locale: string) {
    if (locale === "tr") {
        switch (type) {
            case "sign-in":
                return "Giriş Kodunuz - Türkçe Sözlük";
            case "email-verification":
                return "E-posta Doğrulama - Türkçe Sözlük";
            case "forget-password":
                return "Şifre Sıfırlama - Türkçe Sözlük";
        }
    }

    switch (type) {
        case "sign-in":
            return "Your Login Code - Turkish Dictionary";
        case "email-verification":
            return "Email Verification - Turkish Dictionary";
        case "forget-password":
            return "Password Reset - Turkish Dictionary";
    }
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Unknown error";
}

export const auth = betterAuth({
    ...(authBaseUrl ? { baseURL: authBaseUrl } : {}),
    trustedOrigins,
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
                try {
                    const cookieStore = await cookies();
                    const locale = cookieStore.get("NEXT_LOCALE")?.value || "tr";
                    const view = await render(OtpEmail({ validationCode: otp, locale }));
                    const subject = getOtpEmailSubject(type, locale);

                    if (!process.env.RESEND_API_KEY) {
                        throw new Error("RESEND_API_KEY is not configured");
                    }

                    const resend = new Resend(process.env.RESEND_API_KEY);
                    const { data, error } = await resend.emails.send({
                        from: resendEmailFrom,
                        to: email,
                        subject,
                        text: `Your OTP is ${otp}`,
                        html: view
                    });

                    if (error) {
                        throw new Error(`Resend rejected OTP email: ${error.message}`);
                    }

                    if (!data?.id) {
                        throw new Error("Resend did not return an email id");
                    }
                } catch (error) {
                    console.error("Failed to send OTP", {
                        email,
                        type,
                        error: getErrorMessage(error),
                    });
                    throw new Error("Failed to send verification code");
                }
            },
        }),
        admin()
    ]
});

export type Session = typeof auth.$Infer.Session
export type User = Session["user"]
