/** @jest-environment node */

import { createHash } from "crypto";
import { GET as getIndex, HEAD as headIndex } from "@/src/app/.well-known/agent-skills/index.json/route";
import {
  GET as getSkill,
  HEAD as headSkill,
} from "@/src/app/.well-known/agent-skills/turkish-dictionary-api/SKILL.md/route";

describe("/.well-known/agent-skills routes", () => {
  it("publishes a digest-verified skill index", async () => {
    const indexResponse = getIndex();
    const skillResponse = getSkill();
    const index = await indexResponse.json();
    const skill = await skillResponse.text();
    const [entry] = index.skills;

    expect(indexResponse.status).toBe(200);
    expect(indexResponse.headers.get("Content-Type")).toContain("application/json");
    expect(index.$schema).toBe("https://schemas.agentskills.io/discovery/0.2.0/schema.json");
    expect(entry).toMatchObject({
      name: "turkish-dictionary-api",
      type: "skill-md",
      url: expect.stringMatching(/\/\.well-known\/agent-skills\/turkish-dictionary-api\/SKILL\.md$/),
    });
    expect(entry.digest).toBe(
      `sha256:${createHash("sha256").update(skill).digest("hex")}`,
    );
    expect(skill).toContain("name: turkish-dictionary-api");
  });

  it("returns discovery headers without bodies for HEAD requests", async () => {
    const indexResponse = headIndex();
    const skillResponse = headSkill();

    expect(indexResponse.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(skillResponse.headers.get("Content-Type")).toContain("text/markdown");
    expect(await indexResponse.text()).toBe("");
    expect(await skillResponse.text()).toBe("");
  });
});
