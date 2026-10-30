import { claimHomeIntro, HOME_INTRO_BOOTSTRAP, HOME_INTRO_STORAGE_KEY } from "../home-intro";

beforeEach(() => {
  sessionStorage.clear();
  delete document.documentElement.dataset.homeIntro;
});
afterEach(() => jest.restoreAllMocks());

test("plays only the first claim in this tab session", () => {
  expect(claimHomeIntro()).toBe("play");
  expect(sessionStorage.getItem(HOME_INTRO_STORAGE_KEY)).toBe("1");
  expect(claimHomeIntro()).toBe("skip");
  expect(claimHomeIntro()).toBe("skip");
});

test("the head bootstrap allows a first entrance without consuming it on another page", () => {
  window.eval(HOME_INTRO_BOOTSTRAP);
  expect(document.documentElement.dataset.homeIntro).toBe("play");
  expect(sessionStorage.getItem(HOME_INTRO_STORAGE_KEY)).toBeNull();
  expect(claimHomeIntro()).toBe("play");
});

test("the head bootstrap skips before hydration after a reload", () => {
  claimHomeIntro();
  delete document.documentElement.dataset.homeIntro;
  window.eval(HOME_INTRO_BOOTSTRAP);
  expect(document.documentElement.dataset.homeIntro).toBe("skip");
  expect(claimHomeIntro()).toBe("skip");
});

test("a fresh tab session can play its own entrance", () => {
  claimHomeIntro();
  sessionStorage.clear();
  expect(claimHomeIntro()).toBe("play");
});

test("blocked storage reads leave content stationary", () => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage blocked"); });
  window.eval(HOME_INTRO_BOOTSTRAP);
  expect(document.documentElement.dataset.homeIntro).toBe("skip");
  expect(claimHomeIntro()).toBe("skip");
});

test("blocked storage writes skip instead of replaying on every mount", () => {
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
  expect(claimHomeIntro()).toBe("skip");
  expect(claimHomeIntro()).toBe("skip");
});
