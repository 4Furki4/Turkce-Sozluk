import SigninForm from "@/src/components/customs/auth/signin-form";
import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth"; // Updated import
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Params } from "next/dist/server/request/params";
import { headers } from "next/headers"; // Added headers

// ...

export default async function page({
  params
}: {
  params: Promise<Params>
}) {
  const { locale } = await params
  setRequestLocale(locale as string)
  const session = await auth.api.getSession({
    headers: await headers()
  });
  const t = await getTranslations("SigninForm");
  if (session) redirect("/?warning=alreadySignedIn");
  return (
    // This div now grows to fill the available space from the parent layout
    // and centers the form within it.
    <div className="max-md:h-lvh w-full flex flex-col items-center justify-center">
      <SigninForm
        SignInWithGoogleIntl={t("Sign in with Google")}
        SignInWithDiscordIntl={t("Sign in with Discord")}
        SignInWithGitHubIntl={t("Sign in with GitHub")}
        SigninWithEmailIntl={t("SigninWithEmail")}
        EnterYourEmailIntl={t("EnterYourEmail")}
        MagicLinkIntl={t("MagicLink")}
        EmailSigninLabelIntl={t("EmailSigninLabel")}
        InvalidEmailIntl={t("InvalidEmail")}
      />
    </div>
  );
}
