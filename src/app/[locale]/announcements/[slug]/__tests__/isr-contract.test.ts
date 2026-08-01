import fs from "node:fs";
import path from "node:path";

const routePath = path.join(__dirname, "..", "page.tsx");
const routeSource = fs.readFileSync(routePath, "utf8");

describe("announcement detail ISR contract", () => {
  it("uses the incremental blocking guard without legacy route caching exports", () => {
    expect(routeSource).toMatch(/export const instant = false/);
    expect(routeSource).not.toMatch(/export const prefetch/);
    expect(routeSource).not.toMatch(/export const dynamicParams/);
    expect(routeSource).not.toMatch(/export const revalidate/);
  });

  it("does not use request-bound or competing cache APIs", () => {
    expect(routeSource).not.toMatch(/from ["']next\/headers["']/);
    expect(routeSource).not.toMatch(/\bheaders\s*\(/);
    expect(routeSource).not.toMatch(/\bcookies\s*\(/);
    expect(routeSource).not.toMatch(/\bnoStore\s*\(/);
    expect(routeSource).not.toMatch(/\bunstable_cache\s*\(/);
    expect(routeSource).not.toMatch(/force-dynamic/);
    expect(routeSource).not.toMatch(/createServerSideHelpers/);
  });

  it("uses one cached shared query for prerendering, metadata, and content", () => {
    expect(routeSource).toMatch(/getCachedPublishedAnnouncementBySlug/);
    expect(routeSource).toMatch(/listEligiblePublishedAnnouncementSlugs/);
    expect(routeSource).toMatch(/export async function generateStaticParams/);
    expect(routeSource).toMatch(/generateMetadata/);
    expect(routeSource).toMatch(/getAnnouncementCanonicalPath/);
  });
});
