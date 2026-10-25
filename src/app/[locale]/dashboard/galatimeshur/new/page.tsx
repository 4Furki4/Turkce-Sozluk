import { DictionaryManagementTask } from "@/src/components/task-pages/dictionary-management-task";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id?: string }> }) { const { id } = await params; return <DictionaryManagementTask family="galatimeshur" id={id} />; }
