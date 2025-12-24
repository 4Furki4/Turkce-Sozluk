"use client"
import Image from "next/image";
import { GithubIcon } from "lucide-react";
import SigninButton from "./signin-button";
import SigninWithEmailForm from "./signin-with-email-form";
import { Divider } from "@heroui/react";
import { useSearchParams } from "next/navigation";

type IntlProps = {
  SignInWithGoogleIntl: string;
  SignInWithGitHubIntl: string;
  SignInWithDiscordIntl: string;
  SigninWithEmailIntl: string;
  EnterYourEmailIntl: string;
  MagicLinkIntl: string;
  EmailSigninLabelIntl: string;
  InvalidEmailIntl: string;
}

export default function SigninForm({
  SignInWithGoogleIntl,
  SignInWithGitHubIntl,
  SignInWithDiscordIntl,
  SigninWithEmailIntl,
  EnterYourEmailIntl,
  MagicLinkIntl,
  EmailSigninLabelIntl,
  InvalidEmailIntl,
}: IntlProps) {
  const searchParams = useSearchParams()
  // The backTo param may be double-encoded - decode fully then re-encode properly
  const rawBackTo = searchParams.get("backTo") ?? "/"
  const decodedUrl = decodeURIComponent(rawBackTo)
  // Re-encode for URL safety (spaces -> %20)
  const encodedPath = encodeURI(decodedUrl)

  return (
    <div
      className="flex flex-col gap-2 w-11/12 sm:w-full max-w-2xl shadow-md bg-background/10 backdrop-saturate-150 p-6 sm:p-12 rounded-sm border-2 border-border"
    >
      <SigninButton provider="google" IntlMessage={SignInWithGoogleIntl} startContent={<Image src={"/svg/providers/google.svg"} width={24} height={24} alt="google-icon" />} redirectPath={encodedPath} />
      <SigninButton provider="discord" IntlMessage={SignInWithDiscordIntl} startContent={<Image src={"/svg/providers/discord-blue.svg"} width={24} height={24} alt="discord-icon" />} redirectPath={encodedPath} />
      <SigninButton provider="github" IntlMessage={SignInWithGitHubIntl} startContent={<GithubIcon className="text-foreground" size={24} />} redirectPath={encodedPath} />
      <Divider></Divider>
      <SigninWithEmailForm SigninWithEmailIntl={SigninWithEmailIntl} EnterYourEmailIntl={EnterYourEmailIntl} EmailSigninLabelIntl={EmailSigninLabelIntl} MagicLinkIntl={MagicLinkIntl} InvalidEmailIntl={InvalidEmailIntl} />
    </div>
  );
}
