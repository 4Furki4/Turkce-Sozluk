import { DashboardTask } from "@/src/components/task-pages/dashboard-task";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id?: string }> }) { const value = await params; return <DashboardTask kind="reject" id={value.id} />; }
