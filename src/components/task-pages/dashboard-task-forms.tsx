"use client";
import RequestDetails from "@/src/components/requests/details/RequestDetails";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/src/trpc/react";
import { rolesEnum } from "@/db/schema/users";
import { feedbackStatusEnum, feedbackTypeEnum } from "@/db/schema/feedbacks";
import {
  badgeRequirementTypeEnum,
  badgeCategoryEnum,
} from "@/db/schema/gamification";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import { CustomTextarea } from "@/src/components/customs/heroui/custom-textarea";
import { FormDraft, useTaskDraft } from "@/src/hooks/use-task-draft";
import { TaskCancel, TaskState, useTaskActions } from "./task-page";

export function UserTaskForm({
  id,
  operation,
}: {
  id: string;
  operation: "role" | "badges";
}) {
  const query = api.task.user.useQuery({ id });
  if (query.isLoading || query.error || !query.data)
    return (
      <TaskState
        loading={query.isLoading}
        error={query.error}
        missing={query.error?.data?.code === "NOT_FOUND"}
        retry={() => void query.refetch()}
      />
    );
  return <UserEditor user={query.data} operation={operation} />;
}
function UserEditor({
  user,
  operation,
}: {
  user: {
    id: string;
    name: string | null;
    role: (typeof rolesEnum.enumValues)[number];
  };
  operation: "role" | "badges";
}) {
  const t = useTranslations("TaskPage");
  const { complete } = useTaskActions();
  const [value, setValue] = useState(operation === "role" ? user.role : "");
  const badges = api.badge.getAll.useQuery(undefined, {
    enabled: operation === "badges",
  });
  const callbacks = {
    onSuccess: () => {
      toast.success(t("saved"));
      complete();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  };
  const role = api.user.setRole.useMutation(callbacks);
  const badge = api.badge.assign.useMutation(callbacks);
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value || role.isPending || badge.isPending) return;
        if (operation === "role")
          role.mutate({
            userId: user.id,
            selectedRole: value as typeof user.role,
          });
        else badge.mutate({ userId: user.id, badgeSlug: value });
      }}
    >
      <p>{user.name ?? user.id}</p>
      <Select
        label={t(operation)}
        selectedKeys={value ? [value] : []}
        onChange={(event) => setValue(event.target.value)}
        isRequired
      >
        {operation === "role"
          ? rolesEnum.enumValues.map((item) => (
              <SelectItem key={item}>{item}</SelectItem>
            ))
          : (badges.data ?? []).map((item) => (
              <SelectItem key={item.slug}>
                {item.nameTr} / {item.nameEn}
              </SelectItem>
            ))}
      </Select>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        <TaskCancel />
        <Button
          color="primary"
          type="submit"
          isLoading={role.isPending || badge.isPending}
        >
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
export function FeedbackTaskForm({ id }: { id: number }) {
  const query = api.task.feedback.useQuery(
    { id },
    { enabled: Number.isSafeInteger(id) && id > 0 },
  );
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    query.isLoading ||
    query.error ||
    !query.data
  )
    return (
      <TaskState
        loading={Number.isSafeInteger(id) && id > 0 && query.isLoading}
        error={query.error}
        missing={query.error?.data?.code === "NOT_FOUND"}
        retry={() => void query.refetch()}
      />
    );
  return <FeedbackEditor item={query.data} />;
}
function FeedbackEditor({
  item,
}: {
  item: {
    id: number;
    title: string;
    description: string;
    status: (typeof feedbackStatusEnum.enumValues)[number];
    type: (typeof feedbackTypeEnum.enumValues)[number];
  };
}) {
  const t = useTranslations("TaskPage");
  const labels = useTranslations("Dashboard.feedback");
  const { complete } = useTaskActions();
  const [status, setStatus] = useState(item.status);
  const [type, setType] = useState(item.type);
  const changeStatus = api.admin.feedback.updateStatus.useMutation();
  const changeType = api.admin.feedback.updateType.useMutation();
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
          if (status !== item.status)
            await changeStatus.mutateAsync({ id: item.id, status });
          if (type !== item.type)
            await changeType.mutateAsync({ id: item.id, type });
          toast.success(t("saved"));
          complete();
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="font-bold">{item.title}</p>
      <p>{item.description}</p>
      <Select
        label={t("status")}
        selectedKeys={[status]}
        onChange={(event) => setStatus(event.target.value as typeof status)}
      >
        {feedbackStatusEnum.enumValues.map((value) => (
          <SelectItem key={value}>{labels(`statuses.${value}`)}</SelectItem>
        ))}
      </Select>
      <Select
        label={t("type")}
        selectedKeys={[type]}
        onChange={(event) => setType(event.target.value as typeof type)}
      >
        {feedbackTypeEnum.enumValues.map((value) => (
          <SelectItem key={value}>{labels(`types.${value}`)}</SelectItem>
        ))}
      </Select>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        <TaskCancel />
        <Button color="primary" type="submit" isLoading={saving}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
export function RejectionTaskForm({ id }: { id: number }) {
  const requestsT = useTranslations("Requests");
  const t = useTranslations("TaskPage");
  const { complete } = useTaskActions();
  const [reason, setReason] = useState("");
  const query = api.request.getRequestDetails.useQuery(
    { requestId: id },
    { enabled: Number.isSafeInteger(id) && id > 0 },
  );
  const mutation = api.request.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      complete();
    },
    onError: (error) => toast.error(error.message),
  });
  const draft = useTaskDraft(
    `rejection:${id}`,
    { reason },
    (value) => setReason(value.reason),
    { reason: "" },
  );
  if (query.isLoading || query.error || !query.data)
    return (
      <TaskState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  if (query.data.request.status !== "pending")
    return <p role="status">{query.data.request.status}</p>;
  const { request, user, entityData } = query.data;
  let proposed: unknown = request.newData;
  try {
    if (typeof proposed === "string") proposed = JSON.parse(proposed);
  } catch {
    proposed = {};
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!mutation.isPending)
          mutation.mutate({
            requestId: id,
            reason: reason.trim() || undefined,
          });
      }}
    >
      <section
        className="space-y-3 break-words"
        aria-label={t("requestSummary", { id })}
      >
        <h2 className="font-semibold">
          {t("requestSummary", { id })}:{" "}
          {requestsT(`entityTypes.${request.entityType}`)} —{" "}
          {requestsT(`actions.${request.action}`)}
        </h2>
        <p>{t("submittedBy", { name: user?.name || user?.email || "—" })}</p>
        {request.reason && <p>{request.reason}</p>}
        <RequestDetails
          entityType={request.entityType}
          action={request.action}
          newData={proposed}
          oldData={entityData}
          entityId={request.entityId ?? undefined}
        />
      </section>
      {draft.notice}
      <CustomTextarea
        label={t("reason")}
        value={reason}
        onValueChange={setReason}
      />
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        <TaskCancel />
        <Button type="submit" color="danger" isLoading={mutation.isPending}>
          {t("reject")}
        </Button>
      </div>
    </form>
  );
}

type BadgeValues = {
  slug: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  icon: string;
  requirementType: (typeof badgeRequirementTypeEnum.enumValues)[number];
  requirementValue: number;
  category: (typeof badgeCategoryEnum.enumValues)[number];
};
export function BadgeTaskForm({ slug }: { slug?: string }) {
  const query = api.task.badge.useQuery(
    { slug: slug ?? "" },
    { enabled: Boolean(slug) },
  );
  if (slug && (query.isLoading || query.error || !query.data))
    return (
      <TaskState
        loading={query.isLoading}
        error={query.error}
        missing={query.error?.data?.code === "NOT_FOUND"}
        retry={() => void query.refetch()}
      />
    );
  return <BadgeEditor initial={query.data} />;
}
function BadgeEditor({ initial }: { initial?: BadgeValues }) {
  const t = useTranslations("TaskPage");
  const { complete } = useTaskActions();
  const baseline: BadgeValues = initial ?? {
    slug: "",
    nameTr: "",
    nameEn: "",
    descriptionTr: "",
    descriptionEn: "",
    icon: "",
    requirementType: "min_points",
    requirementValue: 1,
    category: "general",
  };
  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<BadgeValues>({
    defaultValues: baseline,
  });
  const callbacks = {
    onSuccess: () => {
      toast.success(t("saved"));
      complete();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  };
  const create = api.badge.create.useMutation(callbacks);
  const update = api.badge.update.useMutation(callbacks);
  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((value) => {
        if (create.isPending || update.isPending) return;
        if (initial) update.mutate({ ...value, slug: initial.slug });
        else create.mutate(value);
      })}
    >
      <FormDraft
        identity={`badge:${initial?.slug ?? "new"}`}
        control={control}
        reset={reset}
        baseline={baseline}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        {(
          [
            "slug",
            "icon",
            "nameTr",
            "nameEn",
            "descriptionTr",
            "descriptionEn",
          ] as const
        ).map((key) => {
          const Field = key.startsWith("description")
            ? CustomTextarea
            : CustomInput;
          return (
            <Field
              key={key}
              label={t(key)}
              labelPlacement="outside"
              classNames={{ label: "max-w-full whitespace-normal [overflow-wrap:anywhere] h-auto" }}
              isReadOnly={key === "slug" && !!initial}
              isRequired
              isInvalid={!!errors[key]}
              errorMessage={errors[key] ? t("required") : undefined}
              {...register(key, { required: true })}
            />
          );
        })}
        <CustomInput
          label={t("requirementValue")}
          labelPlacement="outside"
          classNames={{ label: "max-w-full whitespace-normal [overflow-wrap:anywhere] h-auto" }}
          isRequired
          isInvalid={!!errors.requirementValue}
          errorMessage={errors.requirementValue ? t("required") : undefined}
          type="number"
          min={0}
          {...register("requirementValue", {
            required: true,
            valueAsNumber: true,
          })}
        />
        <Controller
          name="requirementType"
          control={control}
          render={({ field }) => (
            <Select
              size="lg"
              variant="bordered"
              color="primary"
              classNames={{ trigger: "border-primary/40" }}
              {...field}
              label={t("requirementType")}
              labelPlacement="outside"
              selectedKeys={[field.value]}
            >
              {badgeRequirementTypeEnum.enumValues.map((value) => (
                <SelectItem key={value}>{value}</SelectItem>
              ))}
            </Select>
          )}
        />
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select
              size="lg"
              variant="bordered"
              color="primary"
              classNames={{ trigger: "border-primary/40" }}
              {...field}
              label={t("category")}
              labelPlacement="outside"
              selectedKeys={[field.value]}
            >
              {badgeCategoryEnum.enumValues.map((value) => (
                <SelectItem key={value}>{value}</SelectItem>
              ))}
            </Select>
          )}
        />
      </div>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        <TaskCancel />
        <Button
          type="submit"
          color="primary"
          isLoading={create.isPending || update.isPending}
          className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal py-3"
        >
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
