"use client";
import { api } from "@/src/trpc/react";
import { CardBody, CardFooter, CardHeader, Chip, Spinner, Button } from "@heroui/react";
import { EntityTypes, Actions, Status } from "@/db/schema/requests";
import { useMemo } from "react";
import { useProgressRouter } from "@/src/hooks/use-progress-router";
import { getPathname } from "@/src/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Clock } from "lucide-react";
import RequestDetails from "@/src/components/requests/details/RequestDetails";
import { RawDataViewer } from "@/src/components/requests/details/RawDataViewer";
import { CancelRequestButton } from "@/src/components/requests/cancel-request-button";
import DisplayWordBeingModified from "@/src/components/shared/DisplayWordBeingModified";
import CustomCard from "@/src/components/customs/heroui/custom-card";
import { parseRequestPayload, requestDate, requestErrorKey } from "@/src/lib/request-presentation";

export interface RequestDetailProps { requestId: number; }

export default function RequestDetail({ requestId }: RequestDetailProps) {
  const t = useTranslations("Requests");
  const tDetails = useTranslations("RequestDetails");
  const locale = useLocale();
  const router = useProgressRouter();
  const entityTypeLabels = useMemo<Record<EntityTypes, string>>(() => ({
    words: t("entityTypes.words"),
    meanings: t("entityTypes.meanings"),
    roots: t("entityTypes.roots"),
    related_words: t("entityTypes.related_words"),
    part_of_speechs: t("entityTypes.part_of_speechs"),
    examples: t("entityTypes.examples"),
    authors: t("entityTypes.authors"),
    word_attributes: t("entityTypes.word_attributes"),
    meaning_attributes: t("entityTypes.meaning_attributes"),
    related_phrases: t("entityTypes.related_phrases"),
    pronunciations: t("entityTypes.pronunciations"),
    misspellings: t("entityTypes.misspellings"),
    galatimeshur: t("entityTypes.galatimeshur"),
  }), [t]);

  const actionLabels = useMemo<Record<Actions, string>>(() => ({
    create: t("actions.create"),
    update: t("actions.update"),
    delete: t("actions.delete"),
  }), [t]);

  const statusLabels = useMemo<Record<Status, string>>(() => ({
    pending: t("status.pending"),
    approved: t("status.approved"),
    rejected: t("status.rejected"),
  }), [t]);

  const actionColors = useMemo<Record<Actions, "primary" | "warning" | "danger">>(() => ({
    create: "primary",
    update: "warning",
    delete: "danger",
  }), []);

  const statusColors = useMemo<Record<Status, "primary" | "success" | "danger">>(() => ({
    pending: "primary",
    approved: "success",
    rejected: "danger",
  }), []);


  const { data, isLoading, isError, error, isFetching, refetch } = api.request.getUserRequest.useQuery({ requestId });
  const loadError = requestErrorKey(error?.data?.code, "errorLoadingDetail");
  const back = () => router.push(getPathname({ locale, href: "/my-requests" }));
  const dateLabel = (value: Date | null) => {
    const date = requestDate(value, locale);
    return date ? <time dateTime={date.dateTime} title={date.title}>{date.relative}</time> : t("details.unknownDate");
  };

  if (isLoading) return <div role="status" className="container mx-auto flex min-h-64 w-full min-w-0 items-center justify-center p-6">
    <Spinner label={t("messages.loadingDetail")} />
  </div>;
  if (!data) {
    const notFound = !isError || error?.data?.code === "NOT_FOUND";
    return <div className="container mx-auto w-full min-w-0 space-y-4 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">{t("title")} #{requestId}</h1>
      <p role="alert">{notFound ? tDetails("errors.requestNotFound") : t(loadError)}</p>
      <div className="flex flex-wrap gap-3">
        {!notFound && <Button variant="flat" className="min-h-11" isLoading={isFetching} onPress={() => void refetch()}>{t("buttons.retry")}</Button>}
        <Button variant="flat" color="primary" className="min-h-11" onPress={back}>{t("buttons.backToRequests")}</Button>
      </div>
    </div>;
  }

  const { request, entityData } = data;
  const isPending = request.status === "pending";
  const payload = parseRequestPayload(request.newData);
  // Deletion requests may have no proposed data; their existing entity is the content.
  const newData = payload ?? (request.action === "delete" && request.newData == null ? {} : null);
  return <div className="container mx-auto w-full min-w-0 px-4 py-8 sm:px-6">
    <Button variant="flat" className="mb-6 min-h-11" onPress={back} startContent={<ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />}>{t("buttons.back")}</Button>
    {isError && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3">
      <p>{t(loadError)}</p><Button variant="flat" className="min-h-11" isLoading={isFetching} onPress={() => void refetch()}>{t("buttons.retry")}</Button>
    </div>}
    <CustomCard className="min-w-0 border-border shadow-xs">
      <CardHeader className="min-w-0 border-b border-border p-4 sm:px-6 sm:py-5">
        <div className="flex w-full min-w-0 flex-col gap-4">
          <div className="min-w-0 space-y-2 [overflow-wrap:anywhere]">
            <h1 className="text-2xl font-semibold text-foreground">{t("title")} <span className="tabular-nums">#{request.id}</span></h1>
            <p className="text-foreground">{entityTypeLabels[request.entityType]} · {actionLabels[request.action]}</p>
            {request.entityType === "words" && request.action !== "create" && request.entityId && <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span className="text-sm text-muted-foreground">{t("details.modifyingWordLabel")}:</span>
              <DisplayWordBeingModified wordId={request.entityId} />
            </div>}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Clock aria-hidden className="h-4 w-4 shrink-0" />{dateLabel(request.requestDate)}</div>
            <Chip radius="md" variant="flat" color={statusColors[request.status]} className="shrink-0 whitespace-nowrap">{statusLabels[request.status]}</Chip>
            <Chip radius="md" variant="flat" color={actionColors[request.action]} className="shrink-0 whitespace-nowrap">{actionLabels[request.action]}</Chip>
          </div>
        </div>
      </CardHeader>
      <CardBody className="min-w-0 overflow-visible p-4 sm:px-6 sm:py-5">
        {!isPending && <section className="mb-8 min-w-0 border-b border-border pb-6">
          <h2 className="mb-3 text-lg font-semibold">{t("details.resolution")}</h2>
          <dl className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0"><dt className="text-sm text-muted-foreground">{t("details.resolvedAtLabel")}</dt><dd className="mt-1">{dateLabel(request.resolvedAt)}</dd></div>
            <div className="min-w-0"><dt className="text-sm text-muted-foreground">{t("details.resolvedByLabel")}</dt><dd className="mt-1 [overflow-wrap:anywhere]"><bdi>{request.resolvedBy ?? t("details.unknownResolver")}</bdi></dd></div>
            <div className="min-w-0 sm:col-span-2"><dt className="text-sm text-muted-foreground">{t("details.moderationReason")}</dt><dd dir="auto" className="mt-1 max-w-[75ch] whitespace-pre-wrap [overflow-wrap:anywhere]">{request.moderationReason || t("details.noReason")}</dd></div>
          </dl>
        </section>}
        {request.reason && <section className="mb-8 min-w-0 border-b border-border pb-6">
          <h2 className="mb-3 text-lg font-semibold">{t("details.reason")}</h2>
          <p dir="auto" className="max-w-[75ch] whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{request.reason}</p>
        </section>}
        {newData ? <RequestDetails entityType={request.entityType} action={request.action} newData={newData} oldData={entityData} entityId={request.entityId ?? undefined} /> : <div className="min-w-0">
          <p role="alert">{tDetails("errors.invalidPayload")}</p>
          <RawDataViewer data={request.newData} />
        </div>}
      </CardBody>
      {isPending && <CardFooter className="min-w-0 flex-wrap border-t border-border px-4 py-4 sm:px-6">
        <CancelRequestButton requestId={request.id} onCancelled={back} />
      </CardFooter>}
    </CustomCard>
  </div>;
}
