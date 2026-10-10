import { fireEvent, render, screen } from "@testing-library/react";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

let mockMessages: typeof en | typeof tr = en;
jest.mock("next-intl", () => ({
    useTranslations: (namespace: "SharedUI" | "Errors") => (key: string, values?: Record<string, string>) => {
        let value = (mockMessages[namespace] as Record<string, string>)[key];
        for (const [name, replacement] of Object.entries(values ?? {})) value = value.replace(`{${name}}`, replacement);
        return value;
    },
}));
import PageError from "../[locale]/error";

jest.mock("@/src/i18n/routing", () => ({ Link: ({ href, children, ...props }: React.ComponentProps<"a">) => <a href={href} {...props}>{children}</a> }));

test.each([
    ["tr", tr, "Bu sayfa yüklenemedi", "Tekrar dene", "Sözlüğe dön"],
    ["en", en, "This page could not load", "Try again", "Return to dictionary"],
] as const)("%s offers localized retry and home navigation without exposing the error", (locale, messages, title, retryLabel, homeLabel) => {
    const retry = jest.fn();
    mockMessages = messages;
    render(<PageError error={new Error("private server details")} retry={retry} />);
    expect(screen.getByRole("alert")).toHaveAccessibleName(title);
    expect(screen.getByRole("heading", { name: title })).toHaveFocus();
    expect(screen.queryByText("private server details")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: retryLabel }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: homeLabel })).toHaveAttribute("href", "/");
});
