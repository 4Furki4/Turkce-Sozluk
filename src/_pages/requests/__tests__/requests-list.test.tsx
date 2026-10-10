import React from "react";
import { QueryClient } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import RequestsList from "../requests-list";

const mockQuery = jest.fn();
const mockRefetch = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSearchParams = new URLSearchParams("page=3");
jest.mock("@/src/trpc/react", () => ({ api: { request: { getUserRequests: { useQuery: () => mockQuery() } } } }));
jest.mock("@/src/hooks/use-progress-router", () => ({ useProgressRouter: () => ({ push: mockPush, replace: mockReplace }) }));
jest.mock("next/navigation", () => ({ usePathname: () => "/en/my-requests", useSearchParams: () => mockSearchParams }));
jest.mock("@/src/i18n/routing", () => ({ Link: ({ children }: React.PropsWithChildren) => <a>{children}</a> }));
jest.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
jest.mock("@/src/components/requests/cancel-request-button", () => ({ CancelRequestButton: () => <button>Cancel request</button> }));
jest.mock("@/src/components/customs/heroui/custom-select", () => ({ CustomSelect: () => null }));
jest.mock("@/src/components/customs/heroui/custom-pagination", () => ({ CustomPagination: () => <nav aria-label="Pagination" /> }));
jest.mock("@/src/components/customs/heroui/custom-table", () => ({
  CustomTable: ({ columns, items, renderCell, emptyContent, topContent, bottomContent }: any) => <div>
    {topContent}
    {items.length ? <table><tbody>{items.map((item: any) => <tr key={item.key}>
      {columns.map((column: any) => <td key={column.key}>{renderCell(item, column.key)}</td>)}
    </tr>)}</tbody></table> : emptyContent}
    {bottomContent}
  </div>,
}));
jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, isLoading, isIconOnly, variant, size, ...props }: any) => <button onClick={onPress} {...props}>{children}</button>,
  Chip: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Tooltip: ({ children, content }: React.PropsWithChildren<{ content: React.ReactNode }>) => <div>{children}{content}</div>,
}));

const cachedData = {
  requests: [
    { id: 42, entityType: "words", action: "create", status: "pending", requestDate: null, resolvedAt: null, moderationReason: null },
    { id: 43, entityType: "words", action: "create", status: "approved", requestDate: null, resolvedAt: null, moderationReason: "Private moderation reason" },
  ],
  pagination: { totalPages: 3, totalCount: 22 },
};
const healthyResult = { data: cachedData, isLoading: false, isError: false, error: null, isFetching: false, isPlaceholderData: false, refetch: mockRefetch };

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockReturnValue(healthyResult);
});

async function failCachedRefetch(code: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const queryKey = ["requests", 3];
  const error = { data: { code } };
  client.setQueryData(queryKey, cachedData);
  await expect(client.fetchQuery({ queryKey, queryFn: async () => { throw error; } })).rejects.toEqual(error);
  const state = client.getQueryState(queryKey);
  expect(state?.data).toEqual(cachedData);
  mockQuery.mockReturnValue({ ...healthyResult, data: state?.data, isError: state?.status === "error", error: state?.error });
  client.clear();
}

it.each([
  ["UNAUTHORIZED", "Requests.messages.sessionExpired"],
  ["FORBIDDEN", "Requests.messages.permissionDenied"],
])("hides cached rows, moderation reasons, actions, and pagination after %s", async (code, message) => {
  await failCachedRefetch(code);
  render(<RequestsList />);
  expect(screen.getByRole("alert")).toHaveTextContent(message);
  expect(screen.queryByRole("row")).not.toBeInTheDocument();
  expect(screen.queryByText("Private moderation reason")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
  expect(mockReplace).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Requests.buttons.retry" }));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});

it("keeps cached rows during temporary failure and restores cancellation after retry", async () => {
  await failCachedRefetch("INTERNAL_SERVER_ERROR");
  const { rerender } = render(<RequestsList />);
  expect(screen.getByRole("alert")).toHaveTextContent("Requests.errorLoading");
  expect(screen.getAllByRole("row")).toHaveLength(2);
  expect(screen.getByText("Private moderation reason")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Requests.buttons.retry" }));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
  mockQuery.mockReturnValue(healthyResult);
  rerender(<RequestsList />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancel request" })).toBeInTheDocument();
});
