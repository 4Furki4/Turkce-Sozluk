import { createRobotsTxt } from "./robots-content";

export function GET() {
  return new Response(createRobotsTxt(), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
