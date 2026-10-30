export const HOME_INTRO_STORAGE_KEY = "turkish-dictionary:home-intro:v1";
export type HomeIntroMode = "play" | "skip";

// Runs in the head before the homepage can paint. Reading here does not consume
// the entrance when someone first lands on another page.
export const HOME_INTRO_BOOTSTRAP = `try{document.documentElement.dataset.homeIntro=sessionStorage.getItem(${JSON.stringify(HOME_INTRO_STORAGE_KEY)})==="1"?"skip":"play"}catch{document.documentElement.dataset.homeIntro="skip"}`;

export function claimHomeIntro(): HomeIntroMode {
  try {
    if (window.sessionStorage.getItem(HOME_INTRO_STORAGE_KEY) === "1") return "skip";
    window.sessionStorage.setItem(HOME_INTRO_STORAGE_KEY, "1");
    return "play";
  } catch {
    // If storage is blocked, prefer an immediate page to a repeating entrance.
    return "skip";
  }
}
