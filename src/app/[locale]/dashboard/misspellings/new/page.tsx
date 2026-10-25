import { DictionaryManagementTask } from "@/src/components/task-pages/dictionary-management-task";
import { outcomeQuerySchema } from "@/src/lib/search-outcome-schema";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const term = outcomeQuerySchema.safeParse(params.term);
  const initialTerm = term.success && !term.data.includes("_") ? term.data : undefined;
  return <DictionaryManagementTask family="misspellings" initialTerm={initialTerm} />;
}
