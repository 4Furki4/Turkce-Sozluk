import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import KineticHeadline from "../kinetic-headline";
import { HOME_INTRO_BOOTSTRAP, HOME_INTRO_STORAGE_KEY } from "@/src/lib/home-intro";

beforeEach(() => {
  sessionStorage.clear();
  delete document.documentElement.dataset.homeIntro;
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn(),
  });
});

test("a browser-cache restore cancels an interrupted entrance", () => {
  window.eval(HOME_INTRO_BOOTSTRAP);
  const { unmount } = render(<KineticHeadline>Çağdaş Türkçe Sözlüğü</KineticHeadline>);
  expect(document.documentElement.dataset.homeIntro).toBe("play");
  const restored = new Event("pageshow");
  Object.defineProperty(restored, "persisted", { value: true });
  act(() => { window.dispatchEvent(restored); });
  expect(document.documentElement.dataset.homeIntro).toBe("skip");
  unmount();
});

test("Strict Mode keeps the first entrance, but a real remount skips it", () => {
  window.eval(HOME_INTRO_BOOTSTRAP);
  const { unmount: unmountFirst } = render(<StrictMode><KineticHeadline>Çağdaş Türkçe Sözlüğü</KineticHeadline></StrictMode>);
  expect(document.documentElement.dataset.homeIntro).toBe("play");
  expect(sessionStorage.getItem(HOME_INTRO_STORAGE_KEY)).toBe("1");
  unmountFirst();

  const { unmount: unmountReturn } = render(<StrictMode><KineticHeadline>Çağdaş Türkçe Sözlüğü</KineticHeadline></StrictMode>);
  expect(document.documentElement.dataset.homeIntro).toBe("skip");
  unmountReturn();
});
