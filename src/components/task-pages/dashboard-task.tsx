"use client";
import { useTranslations } from "next-intl";
import { TaskPage, TaskState } from "./task-page";
import EditWordFormPage from "@/src/_pages/dashboard/word-list/edit-modal/edit-word-modal";
import {
  UserTaskForm,
  FeedbackTaskForm,
  RejectionTaskForm,
  BadgeTaskForm,
} from "./dashboard-task-forms";
export function DashboardTask({
  kind,
  id,
}: {
  kind: "word" | "role" | "badges" | "feedback" | "reject" | "badge";
  id?: string;
}) {
  const t = useTranslations("TaskPage");
  const d = useTranslations("Dashboard");
  const parent =
    kind === "word"
      ? "/dashboard/word-list"
      : kind === "role" || kind === "badges"
        ? "/dashboard/user-list"
        : kind === "feedback"
          ? "/dashboard/feedback"
          : kind === "reject"
            ? {
                pathname: "/dashboard/requests/[id]" as const,
                params: { id: id! },
              }
            : "/dashboard/badges";
  const label =
    kind === "word"
      ? t("word")
      : kind === "role" || kind === "badges"
        ? d("UserList.title")
        : kind === "feedback"
          ? t("feedback")
          : kind === "reject"
            ? t("reject")
            : t("badgeList");
  return (
    <TaskPage
      title={t(
        kind === "word"
          ? "edit"
          : kind === "badge"
            ? id
              ? "editBadge"
              : "newBadge"
            : kind,
      )}
      parent={parent}
      parentLabel={label}
      capability="admin"
    >
      {kind === "word" ? (
        Number.isSafeInteger(Number(id)) && Number(id) > 0 ? (
          <EditWordFormPage wordId={Number(id)} />
        ) : (
          <TaskState missing />
        )
      ) : kind === "role" || kind === "badges" ? (
        <UserTaskForm id={id!} operation={kind} />
      ) : kind === "feedback" ? (
        <FeedbackTaskForm id={Number(id)} />
      ) : kind === "reject" ? (
        <RejectionTaskForm id={Number(id)} />
      ) : (
        <BadgeTaskForm slug={id} />
      )}
    </TaskPage>
  );
}
