import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CancelRequestButton } from "../cancel-request-button";

const mockCancel = jest.fn();
const mockInvalidate = jest.fn().mockResolvedValue(undefined);
const mockCaptcha = jest.fn();
jest.mock("@/src/trpc/react", () => ({ api: {
  request: { cancelRequest: { useMutation: () => ({ mutateAsync: mockCancel }) } },
  useUtils: () => ({ request: { getUserRequests: { invalidate: mockInvalidate } } }),
} }));
jest.mock("react-google-recaptcha-v3", () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: mockCaptcha }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }));
jest.mock("next-intl", () => ({ useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
jest.mock("@/src/components/customs/heroui/custom-modal", () => ({ CustomModal: ({ isOpen, children }: any) => isOpen ? <div role="dialog">{children}</div> : null }));
jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, isDisabled, isLoading, color, variant, size, ...props }: any) => <button disabled={isDisabled} onClick={onPress} {...props}>{children}</button>,
  ModalContent: ({ children }: any) => <div>{children}</div>,
  ModalBody: ({ children }: any) => <div>{children}</div>,
  ModalHeader: ({ children }: any) => <h2>{children}</h2>,
  ModalFooter: ({ children }: any) => <div>{children}</div>,
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockCaptcha.mockResolvedValue("test-token");
  mockInvalidate.mockResolvedValue(undefined);
});

it("retains confirmation and shows a retryable error when cancellation fails", async () => {
  const done = jest.fn();
  mockCancel.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ success: true });
  render(<CancelRequestButton requestId={42} onCancelled={done} />);
  fireEvent.click(screen.getByRole("button", { name: "Requests.buttons.cancelSpecific" }));
  fireEvent.click(screen.getByRole("button", { name: "RequestDetails.modals.cancel.confirm" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Requests.messages.cancelFailed");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(done).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "RequestDetails.modals.cancel.confirm" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(done).toHaveBeenCalledTimes(1);
  expect(mockInvalidate).toHaveBeenCalledTimes(1);
});

it("locks duplicate submissions while verification is still pending", async () => {
  let finish!: (token: string) => void;
  mockCaptcha.mockReturnValueOnce(new Promise<string>(resolve => { finish = resolve; }));
  mockCancel.mockResolvedValue({ success: true });
  render(<CancelRequestButton requestId={42} />);
  fireEvent.click(screen.getByRole("button", { name: "Requests.buttons.cancelSpecific" }));
  const confirm = screen.getByRole("button", { name: "RequestDetails.modals.cancel.confirm" });
  fireEvent.click(confirm); fireEvent.click(confirm);
  expect(mockCaptcha).toHaveBeenCalledTimes(1);
  expect(confirm).toBeDisabled();
  expect(screen.getByRole("button", { name: "RequestDetails.modals.cancel.cancel" })).toBeDisabled();
  expect(mockCancel).not.toHaveBeenCalled();
  await act(async () => finish("test-token"));
  expect(mockCancel).toHaveBeenCalledTimes(1);
  expect(mockCancel).toHaveBeenCalledWith({ requestId: 42, captchaToken: "test-token" });
});

it("preserves the dialog after verification fails and makes no mutation", async () => {
  mockCaptcha.mockRejectedValueOnce(new Error("verification unavailable"));
  render(<CancelRequestButton requestId={42} />);
  fireEvent.click(screen.getByRole("button", { name: "Requests.buttons.cancelSpecific" }));
  fireEvent.click(screen.getByRole("button", { name: "RequestDetails.modals.cancel.confirm" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Errors.captchaFailed");
  expect(mockCancel).not.toHaveBeenCalled();
});
