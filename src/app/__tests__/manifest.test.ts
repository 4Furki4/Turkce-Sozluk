/** @jest-environment node */

import manifest from "../manifest.json";

describe("web app manifest", () => {
  it("opts into installed-app link handling and launches on the cached Turkish shell", () => {
    expect(manifest.id).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.handle_links).toBe("preferred");
    expect(manifest.launch_handler).toEqual({
      client_mode: "navigate-existing",
    });
    expect(manifest.start_url).toBe("/tr");
    expect(manifest.display).toBe("standalone");
  });
});
