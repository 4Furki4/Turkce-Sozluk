import React from "react";
import NextLink from "next/link";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { TaskPage, TaskCancel, useTaskActions } from "../task-page";
import { FormDraft } from "@/src/hooks/use-task-draft";
import { recordTaskLocation } from "@/src/lib/task-navigation";

const route = "/en/contribute-word/7/edit";
let mockPathname = route;
const mockRouter = { replace: jest.fn(), back: jest.fn(), refresh: jest.fn() };
const mockInvalidate = jest.fn(async () => {});
let mockSearch = new URLSearchParams();
const mockSession = {
  data: { user: { id: "contributor", role: "user" } } as any,
  isPending: false,
};
jest.mock("@/src/hooks/use-progress-router", () => ({
  useProgressRouter: () => mockRouter,
}));
jest.mock("@/src/lib/auth-client", () => ({
  authClient: { useSession: () => mockSession },
}));
jest.mock("@/src/trpc/react", () => ({
  api: { useUtils: () => ({ invalidate: mockInvalidate }) },
}));
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearch,
}));
jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: any) =>
    key === "back" ? `Back to ${values.destination}` : key,
}));
jest.mock("@/src/i18n/routing", () => ({
  getPathname: ({ href }: any) =>
    "/en" +
    (typeof href === "string"
      ? href
      : Object.entries(href.params ?? {}).reduce(
          (path, [key, value]) => path.replace(`[${key}]`, String(value)),
          href.pathname,
        )),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));
jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, color, variant, ...props }: any) => (
    <button type="button" {...props} onClick={onPress}>
      {children}
    </button>
  ),
  Spinner: ({ label }: any) => <p>{label}</p>,
}));

function Editor() {
  const form = useForm({ defaultValues: { name: "kitap" } });
  const { complete } = useTaskActions();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void complete();
      }}
    >
      <FormDraft
        identity="word:7"
        control={form.control}
        reset={form.reset}
        baseline={{ name: "kitap" }}
      />
      <input aria-label="Word" {...form.register("name")} />
      <button type="submit">Submit</button>
      <TaskCancel />
    </form>
  );
}
function setup() {
  return render(
    <>
      <NextLink href="/en/saved-words">Outside navigation</NextLink>
      <TaskPage title="Edit word" parent="/word-list" parentLabel="Words">
        <Editor />
      </TaskPage>
    </>,
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  mockSearch = new URLSearchParams();
  mockPathname = route;
  mockSession.data = { user: { id: "contributor", role: "user" } };
  window.history.replaceState(null, "", route);
  HTMLElement.prototype.scrollIntoView = jest.fn();
});

it("offers inline discard/keep choices when leaving dirty work, including navigation outside the form", async () => {
  setup();
  fireEvent.change(screen.getByLabelText("Word"), {
    target: { value: "defter" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Outside navigation" }));
  expect(screen.getByRole("alert")).toHaveTextContent("leave");
  expect(mockRouter.replace).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "keepEditing" }));
  expect(screen.getByLabelText("Word")).toHaveValue("defter");
  fireEvent.click(screen.getByRole("button", { name: "cancel" }));
  fireEvent.click(screen.getByRole("button", { name: "discard" }));
  expect(mockRouter.replace).toHaveBeenCalledWith("/en/word-list");
  expect(sessionStorage.getItem("task-draft:v1:contributor:word:7")).toBeNull();
});

it("does not treat searching a read-only chooser as unsaved work", () => {
  mockPathname = "/en/pronunciation-voting/new";
  render(<TaskPage title="Choose a word" parent="/word-list" parentLabel="Words"><input aria-label="Find a word" /><TaskCancel /></TaskPage>);
  fireEvent.change(screen.getByLabelText("Find a word"), { target: { value: "kitap" } });
  fireEvent.click(screen.getByRole("button", { name: "cancel" }));
  expect(mockRouter.replace).toHaveBeenCalledWith("/en/word-list");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("recovers an unfinished text draft explicitly and clears it when a submission completes", async () => {
  sessionStorage.setItem(
    "task-draft:v1:contributor:word:7",
    JSON.stringify({
      version: 1,
      savedAt: Date.now(),
      revision: JSON.stringify({ name: "kitap" }),
      values: { name: "defter" },
    }),
  );
  setup();
  expect(screen.getByLabelText("Word")).toHaveValue("kitap");
  fireEvent.click(await screen.findByRole("button", { name: "restoreDraft" }));
  expect(screen.getByLabelText("Word")).toHaveValue("defter");
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith("/en/word-list"),
  );
  expect(mockInvalidate).toHaveBeenCalled();
  expect(sessionStorage.getItem("task-draft:v1:contributor:word:7")).toBeNull();
});

it("uses native Back when the immediate source was observed in this document", async () => {
  recordTaskLocation("/en/word-list");
  recordTaskLocation(route);
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
});

it("preserves modifier-click behavior on the return link", () => {
  setup();
  fireEvent.click(screen.getByRole("link", { name: "Back to Words" }), {
    ctrlKey: true,
  });
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(mockRouter.back).not.toHaveBeenCalled();
});

it("keeps cached drafts separate from a newly signed-in account", async () => {
  sessionStorage.setItem("task-draft:account", "previous-user");
  sessionStorage.setItem("task-draft:v1:previous-user:word:7", "private text");
  setup();
  await waitFor(() =>
    expect(
      sessionStorage.getItem("task-draft:v1:previous-user:word:7"),
    ).toBeNull(),
  );
  expect(screen.getByLabelText("Word")).toHaveValue("kitap");
});

it("continues saving new work while an older recovery notice is unanswered", async () => {
  const key = "task-draft:v1:contributor:word:7";
  sessionStorage.setItem(
    key,
    JSON.stringify({
      version: 1,
      savedAt: Date.now(),
      revision: JSON.stringify({ name: "kitap" }),
      values: { name: "older draft" },
    }),
  );
  setup();
  await screen.findByRole("button", { name: "restoreDraft" });
  fireEvent.change(screen.getByLabelText("Word"), {
    target: { value: "replacement draft" },
  });
  await waitFor(() =>
    expect(JSON.parse(sessionStorage.getItem(key)!).values.name).toBe(
      "replacement draft",
    ),
  );
});

it("shows every breadcrumb level and returns one step to Contribute with the original source retained", () => {
  const source = "/en/saved-words?page=2#word-7";
  mockSearch = new URLSearchParams({ returnTo: source });
  window.history.replaceState(null, "", `${route}?${mockSearch}`);
  const chooser =
    "/en/contribute-word/7?" + new URLSearchParams({ returnTo: source });
  render(
    <TaskPage
      title="Edit kitap"
      breadcrumbLabel="Edit"
      parent={{
        pathname: "/contribute-word/[wordId]",
        params: { wordId: "7" },
      }}
      parentLabel="Contribute"
      ancestors={[
        {
          href: { pathname: "/search/[word]", params: { word: "kitap" } },
          label: "kitap",
        },
      ]}
    >
      <Editor />
    </TaskPage>,
  );
  const back = screen.getByRole("link", { name: "Back to Contribute" });
  expect(back).toHaveAttribute("href", chooser);
  expect(
    screen.getByRole("link", { name: "Contribute", exact: true }),
  ).toHaveAttribute("href", chooser);
  expect(
    screen.getByRole("link", { name: "kitap", exact: true }),
  ).toHaveAttribute("href", "/en/search/kitap");
  expect(screen.getByText("Edit", { exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  fireEvent.click(back);
  expect(mockRouter.replace).toHaveBeenCalledWith(chooser);
});
