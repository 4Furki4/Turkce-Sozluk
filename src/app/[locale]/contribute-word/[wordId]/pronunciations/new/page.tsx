import { WordTask } from "@/src/components/task-pages/word-task";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({ params: paramsPromise }: { params: Promise<{ wordId: string; meaningId?: string; relationId?: string }> }) { const params = await paramsPromise; return <WordTask wordId={params.wordId} kind="pronunciations" operation="new" />; }
