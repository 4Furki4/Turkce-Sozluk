import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import SimpleContributionForm from "../simple-contribution-form";

const mockSubmit = jest.fn();
const mockSetSubmitting = jest.fn();

jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: async () => "test-token" }),
}));
jest.mock("@/src/trpc/react", () => ({
  api: { request: { createSimpleWordRequest: { useMutation: (options?: any) => ({
    mutateAsync: async (input: unknown) => {
      try {
        const result = await mockSubmit(input);
        options?.onSuccess?.(result);
        return result;
      } catch (error) {
        options?.onError?.(error);
        throw error;
      }
    },
  }) } } },
}));
jest.mock("@heroui/react", () => ({
  CardBody: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, isLoading, isDisabled, color, size, ...props }: any) => (
    <button disabled={isDisabled} {...props}>{children}</button>
  ),
}));
jest.mock("@/src/components/customs/heroui/custom-card", () => ({
  __esModule: true, default: ({ children }: any) => <div>{children}</div>,
}));
jest.mock("@/src/components/customs/heroui/custom-input", () => ({
  CustomInput: React.forwardRef<HTMLInputElement, any>(function Input({ label, isRequired, isInvalid, errorMessage, ...props }, ref) {
    return <label>{label}<input ref={ref} {...props} /></label>;
  }),
}));

beforeEach(() => jest.clearAllMocks());

function renderForm() {
  render(<SimpleContributionForm session={null} locale="en" isSubmitting={false} setIsSubmitting={mockSetSubmitting} />);
  fireEvent.change(screen.getByLabelText("wordName"), { target: { value: "defter" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
}

it("confirms a successful request once and resets the input", async () => {
  mockSubmit.mockResolvedValueOnce({});
  renderForm();
  await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
  expect(mockSubmit).toHaveBeenCalledWith({ wordName: "defter", captchaToken: "test-token" });
  expect(screen.getByLabelText("wordName")).toHaveValue("");
  expect(mockSetSubmitting).toHaveBeenLastCalledWith(false);
});

it("reports a failed request once while retaining the word for retry", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    mockSubmit.mockRejectedValueOnce(new Error("network unavailable"));
    renderForm();
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith("requestFailed");
    expect(screen.getByLabelText("wordName")).toHaveValue("defter");
    expect(toast.success).not.toHaveBeenCalled();
    expect(mockSetSubmitting).toHaveBeenLastCalledWith(false);
  } finally {
    log.mockRestore();
  }
});
