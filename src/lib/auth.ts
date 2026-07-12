import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // Ensure this path is correct
import { schema } from "@/db/index";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP, jwt, oidcProvider } from "better-auth/plugins";
import { Resend } from "resend";
import { render } from "@react-email/render";
import OtpEmail from "@/src/emails/otp-email";
import { cookies } from "next/headers";
import { createOpenIdConfiguration } from "@/src/lib/oidc-metadata";

const authBaseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
const trustedOrigins = [
    authBaseUrl,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_URL,
].filter((origin): origin is string => Boolean(origin));

const resendEmailFrom = process.env.RESEND_EMAIL_FROM || "Türkçe Sözlük <no-reply@turkce-sozluk.com>";
const openIdConfiguration = createOpenIdConfiguration();

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
            jwks: schema.jwks,
            oauthAccessToken: schema.oauthAccessToken,
            oauthApplication: schema.oauthApplication,
            oauthConsent: schema.oauthConsent,
        },
    }),
    disabledPaths: ["/token"],
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
        jwt({
            disableSettingJwtHeader: true,
            jwt: {
                issuer: openIdConfiguration.issuer,
            },
            jwks: {
                keyPairConfig: {
                    alg: "RS256",
                    modulusLength: 2048,
                },
            },
        }),
        oidcProvider({
            allowDynamicClientRegistration: true,
            allowPlainCodeChallengeMethod: false,
            loginPage: "/tr/signin",
            metadata: openIdConfiguration,
            requirePKCE: true,
            scopes: ["api"],
            storeClientSecret: "hashed",
            useJWTPlugin: true,
        }),
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

                        if (!process.env.RESEND_API_KEY) {
                            throw new Error("RESEND_API_KEY is not configured");
                        }

                        const resend = new Resend(process.env.RESEND_API_KEY);
                        await resend.emails.send({
                            from: resendEmailFrom,
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
