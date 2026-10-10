import React from "react";
import { QueryClient } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import RequestDetail from "../request-detail";

const mockQuery = jest.fn();
const mockRefetch = jest.fn();
const mockPush = jest.fn();
jest.mock("@/src/trpc/react", () => ({ api: { request: { getUserRequest: { useQuery: () => mockQuery() } } } }));
jest.mock("@/src/hooks/use-progress-router", () => ({ useProgressRouter: () => ({ push: mockPush }) }));
jest.mock("@/src/i18n/routing", () => ({ getPathname: () => "/en/my-requests" }));
jest.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
jest.mock("@/src/components/requests/details/RequestDetails", () => ({ __esModule: true, default: () => <p>Saved request content</p> }));
jest.mock("@/src/components/requests/cancel-request-button", () => ({ CancelRequestButton: () => <button>Cancel request</button> }));
jest.mock("@/src/components/customs/heroui/custom-card", () => ({ __esModule: true, default: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, startContent, isLoading, variant, color, ...props }: any) => <button onClick={onPress} {...props}>{startContent}{children}</button>,
  CardBody: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Chip: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Spinner: () => <span>Loading</span>,
}));

const cachedData = {
  request: {
    id: 42, entityType: "words", action: "create", status: "pending", entityId: null,
    newData: { name: "kelime" }, reason: "Private contribution reason", requestDate: null,
  },
  entityData: null,
};
const healthyResult = { data: cachedData, isLoading: false, isError: false, error: null, isFetching: false, refetch: mockRefetch };

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockReturnValue(healthyResult);
});

async function failCachedRefetch(code: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const queryKey = ["request", 42];
  const error = { data: { code } };
  client.setQueryData(queryKey, cachedData);
  await expect(client.fetchQuery({ queryKey, queryFn: async () => { throw error; } })).rejects.toEqual(error);
  const state = client.getQueryState(queryKey);
  expect(state?.data).toEqual(cachedData);
  mockQuery.mockReturnValue({ ...healthyResult, data: state?.data, isError: state?.status === "error", error: state?.error });
  client.clear();
}

it.each([
  ["NOT_FOUND", "RequestDetails.errors.requestNotFound"],
  ["UNAUTHORIZED", "Requests.messages.sessionExpired"],
  ["FORBIDDEN", "Requests.messages.permissionDenied"],
])("hides cached private content and cancellation after %s", async (code, message) => {
  await failCachedRefetch(code);
  render(<RequestDetail requestId={42} />);
  expect(screen.getByRole("alert")).toHaveTextContent(message);
  expect(screen.queryByText("Saved request content")).not.toBeInTheDocument();
  expect(screen.queryByText("Private contribution reason")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Requests.buttons.backToRequests" }));
  expect(mockPush).toHaveBeenCalledWith("/en/my-requests");
});

it("keeps cached details readable during temporary failure and restores cancellation after retry", async () => {
  await failCachedRefetch("INTERNAL_SERVER_ERROR");
  const { rerender } = render(<RequestDetail requestId={42} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Requests.errorLoadingDetail");
  expect(screen.getByText("Saved request content")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Requests.buttons.retry" }));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
  mockQuery.mockReturnValue(healthyResult);
  rerender(<RequestDetail requestId={42} />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancel request" })).toBeInTheDocument();
});
