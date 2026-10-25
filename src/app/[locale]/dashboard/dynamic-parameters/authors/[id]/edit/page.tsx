import { ParameterTask } from "@/src/components/task-pages/parameter-task";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id?: string }> }) { return <ParameterTask type="authors" id={(await params).id} />; }
