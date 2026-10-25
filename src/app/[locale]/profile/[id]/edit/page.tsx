import { auth } from "@/src/lib/auth";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { TaskPage } from "@/src/components/task-pages/task-page";
import EditProfileForm from "@/src/_pages/profile/edit-profile-form";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const session = await auth.api.getSession({ headers: await headers() }); const t = await getTranslations("TaskPage");
  return <TaskPage title={t("edit")} parent={{ pathname: "/profile/[id]", params: { id } }} parentLabel={t("profile")} media>{session?.user.id === id ? <EditProfileForm user={session.user} /> : session ? <p role="alert">{t("forbidden")}</p> : null}</TaskPage>;
}
