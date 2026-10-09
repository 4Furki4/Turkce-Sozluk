/** @jest-environment node */
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SigninForm from "../signin-form";

jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("backTo=%2Fen%2Fsaved-words") }));
jest.mock("next/image", () => ({ __esModule: true, default: () => null }));
jest.mock("../signin-button", () => ({ __esModule: true, default: ({ IntlMessage }: { IntlMessage: string }) => <button>{IntlMessage}</button> }));
jest.mock("@/src/lib/auth-client", () => ({ authClient: { emailOtp: { sendVerificationOtp: jest.fn() } } }));
jest.mock("@heroui/react", () => ({
  Divider: () => <hr />,
  Input: ({ label, placeholder }: { label: string; placeholder: string }) => <label>{label}<input placeholder={placeholder} /></label>,
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

test("the sign-in fallback renders on the server without browser globals", () => {
  const client = new QueryClient();
  const html = renderToString(
    <QueryClientProvider client={client}>
      <SigninForm
        SignInWithGoogleIntl="Google"
        SignInWithGitHubIntl="GitHub"
        SignInWithDiscordIntl="Discord"
        SigninWithEmailIntl="Email sign-in"
        EnterYourEmailIntl="Enter email"
        MagicLinkIntl="Magic link"
        EmailSigninLabelIntl="Send code"
        InvalidEmailIntl="Invalid email"
      />
    </QueryClientProvider>
  );
  expect(html).toContain("Email sign-in");
  expect(html).toContain("Send code");
  client.clear();
});
