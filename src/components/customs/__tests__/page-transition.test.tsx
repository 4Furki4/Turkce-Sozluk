import { fireEvent, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import PageTransition from "../page-transition";

jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));

const pathname = jest.mocked(usePathname);
const cancel = jest.fn();
const animate = jest.fn();
const motionListeners = new Set<() => void>();
let reducedMotion = false;
let animation: Animation;

beforeEach(() => {
  jest.clearAllMocks();
  reducedMotion = false;
  motionListeners.clear();
  pathname.mockReturnValue("/tr");
  animation = { cancel, playState: "running", onfinish: null } as unknown as Animation;
  animate.mockReturnValue(animation);
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: reducedMotion,
    addEventListener: (_: string, listener: () => void) => motionListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => motionListeners.delete(listener),
  }));
  jest.spyOn(window, "getComputedStyle").mockReturnValue({
    opacity: "0.94",
    transform: "matrix(1, 0, 0, 1, 0, 2)",
    getPropertyValue: () => "cubic-bezier(0.16, 1, 0.3, 1)",
  } as unknown as CSSStyleDeclaration);
});

afterEach(() => jest.restoreAllMocks());

it("keeps initial content visible and preserves child state across route changes", () => {
  const page = <PageTransition><input aria-label="Draft" defaultValue="" /></PageTransition>;
  const { rerender } = render(page);
  expect(animate).not.toHaveBeenCalled();
  const input = screen.getByRole("textbox", { name: "Draft" });
  fireEvent.change(input, { target: { value: "unfinished draft" } });

  pathname.mockReturnValue("/tr/kelime-listesi");
  rerender(<PageTransition><input aria-label="Draft" defaultValue="" /></PageTransition>);

  expect(screen.getByRole("textbox", { name: "Draft" })).toBe(input);
  expect(input).toHaveValue("unfinished draft");
  expect(animate).toHaveBeenCalledWith(
    [{ opacity: "0.82", transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
    { duration: 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  );
});

it("does not replay on content updates with the same pathname", () => {
  const { rerender } = render(<PageTransition>Page 1</PageTransition>);
  rerender(<PageTransition>Page 2 with new filters</PageTransition>);
  expect(animate).not.toHaveBeenCalled();
});

it("uses only a short fade with reduced motion from the first navigation", () => {
  reducedMotion = true;
  const { rerender } = render(<PageTransition>Home</PageTransition>);
  pathname.mockReturnValue("/tr/kelime-listesi");
  rerender(<PageTransition>Words</PageTransition>);
  expect(animate).toHaveBeenCalledWith(
    [{ opacity: "0.82" }, { opacity: 1 }],
    { duration: 100, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  );
});

it("retargets rapid navigation from the current appearance and cancels on unmount", () => {
  const { rerender, unmount } = render(<PageTransition>Home</PageTransition>);
  pathname.mockReturnValue("/tr/kelime-listesi");
  rerender(<PageTransition>Words</PageTransition>);
  pathname.mockReturnValue("/tr/bagis");
  rerender(<PageTransition>Donate</PageTransition>);
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(animate.mock.calls[1][0][0]).toEqual({
    opacity: "0.94", transform: "matrix(1, 0, 0, 1, 0, 2)",
  });
  unmount();
  expect(cancel).toHaveBeenCalledTimes(2);
  expect(motionListeners.size).toBe(0);
});

it("cancels active movement when the motion preference changes", () => {
  const { rerender } = render(<PageTransition>Home</PageTransition>);
  pathname.mockReturnValue("/tr/kelime-listesi");
  rerender(<PageTransition>Words</PageTransition>);
  for (const listener of motionListeners) listener();
  expect(cancel).toHaveBeenCalledTimes(1);
});

it("keeps keyboard navigation stationary and enables motion again on pointer input", () => {
  const { rerender } = render(<PageTransition>Home</PageTransition>);
  fireEvent.keyDown(document, { key: "Enter" });
  pathname.mockReturnValue("/tr/kelime-listesi");
  rerender(<PageTransition>Words</PageTransition>);
  expect(animate).not.toHaveBeenCalled();
  fireEvent.pointerDown(document);
  pathname.mockReturnValue("/tr");
  rerender(<PageTransition>Home</PageTransition>);
  expect(animate).toHaveBeenCalledTimes(1);
});

it("leaves navigation functional when the animation API is unavailable", () => {
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: undefined });
  const { rerender } = render(<PageTransition>Home</PageTransition>);
  pathname.mockReturnValue("/tr/kelime-listesi");
  rerender(<PageTransition>Words</PageTransition>);
  expect(screen.getByText("Words")).toBeVisible();
});

it("leaves the homepage immediate instead of adding another route entrance", () => {
  pathname.mockReturnValue("/tr/kelime-listesi");
  const { rerender } = render(<PageTransition>Words</PageTransition>);
  pathname.mockReturnValue("/tr");
  rerender(<PageTransition><div data-home-page>Home</div></PageTransition>);
  expect(animate).not.toHaveBeenCalled();
  expect(screen.getByText("Home")).toBeVisible();
});
