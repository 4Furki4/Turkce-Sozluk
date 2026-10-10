import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Requests UI fixtures", robots: { index: false, follow: false } };

export default async function Page() {
  if (process.env.NODE_ENV === "development") {
    const { default: RequestsStressPreview } = await import("@/src/components/dev/requests-stress-preview");
    return <RequestsStressPreview />;
  }
  notFound();
}
