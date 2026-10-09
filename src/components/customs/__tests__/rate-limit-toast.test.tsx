import { act, fireEvent, render, screen } from "@testing-library/react";
import { Toaster, toast } from "sonner";
import { showRateLimitToast } from "../rate-limit-toast";

jest.mock("next-intl", () => ({ useTranslations: () => (key: string, values?: { seconds: number }) => key === "RateLimitCountdown" ? `Wait ${values?.seconds}s` : key }));
jest.mock("@/src/hooks/use-progress-router", () => ({ useProgressRouter: () => ({ refresh: jest.fn() }) }));

afterEach(() => { act(() => { toast.dismiss(); }); });

test("the installed toaster renders a single localized message with a working retry action", async () => {
    const retry = jest.fn();
    render(<Toaster />);
    act(() => { showRateLimitToast({ retry, retryAt: Date.now() }); showRateLimitToast({ retry, retryAt: Date.now() }); });
    const action = await screen.findByRole("button", { name: "Retry" });
    expect(screen.getAllByText("TooManyRequests")).toHaveLength(1);
    fireEvent.click(action);
    expect(retry).toHaveBeenCalledTimes(1);
});

test("counts down from the backend deadline, blocks early retry and enables it at zero", async () => {
    jest.useFakeTimers();
    const retry = jest.fn();
    render(<Toaster />);
    const retryAt = Date.now() + 3_000;
    act(() => { showRateLimitToast({ retry, retryAt }); jest.advanceTimersByTime(0); });
    const action = screen.getByRole("button", { name: "Retry" });
    expect(action).toBeDisabled();
    expect(screen.getByText("Wait 3s")).toBeInTheDocument();
    fireEvent.click(action);
    expect(retry).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText("Wait 2s")).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(2000); });
    expect(screen.getByText("RateLimitReady")).toBeInTheDocument();
    expect(action).toBeEnabled();
    fireEvent.click(action);
    expect(retry).toHaveBeenCalledTimes(1);
    act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
});
