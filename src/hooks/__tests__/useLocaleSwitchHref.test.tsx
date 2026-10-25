import { renderHook } from "@testing-library/react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { usePathname as useIntlPathname } from "@/src/i18n/routing";
import { useLocaleSwitchHref } from "../useLocaleSwitchHref";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(), usePathname: jest.fn(), useSearchParams: jest.fn(),
}));
jest.mock("@/src/i18n/routing", () => ({ usePathname: jest.fn() }));

it.each([
  ["/contribute-word/[wordId]/edit", { wordId: "42" }],
  ["/contribute-word/[wordId]/meanings/[meaningId]/edit", { wordId: "42", meaningId: "7" }],
  ["/contribute-word/[wordId]/related-words/[relationId]/edit", { wordId: "42", relationId: "9" }],
  ["/dashboard/user-list/[userId]/role", { userId: "user-1" }],
])("preserves every task identity when switching %s", (pathname, params) => {
  jest.mocked(useParams).mockReturnValue({ locale: "en", ...params });
  jest.mocked(usePathname).mockReturnValue("/en/contribute-word/42/edit");
  jest.mocked(useIntlPathname).mockReturnValue(pathname as ReturnType<typeof useIntlPathname>);
  const query = new URLSearchParams({ returnTo: "/en/search/a%25b?entry=42&word=ev+ışık" });
  jest.mocked(useSearchParams).mockReturnValue(query as ReturnType<typeof useSearchParams>);
  const { result } = renderHook(() => useLocaleSwitchHref());
  expect(result.current).toEqual({ pathname, params, query: query.toString() });
});
