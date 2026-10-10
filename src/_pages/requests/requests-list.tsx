"use client";
import { api } from "@/src/trpc/react";
import { Button, Chip, Tooltip } from "@heroui/react";
import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useProgressRouter } from "@/src/hooks/use-progress-router";
import { EntityTypes, Actions, Status, entityTypesEnum } from "@/db/schema/requests";
import { Link } from "@/src/i18n/routing";
import { keepPreviousData } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomPagination } from "@/src/components/customs/heroui/custom-pagination";
import { CustomSelect } from "@/src/components/customs/heroui/custom-select";
import { CancelRequestButton } from "@/src/components/requests/cancel-request-button";
import { requestDate, requestErrorKey } from "@/src/lib/request-presentation";
import { readRequestListParams, requestPageSizes, updateRequestListParams, type RequestListChanges } from "@/src/lib/request-list-params";
import { Info } from "lucide-react";

type Row = {
  key: number;
  entityType: EntityTypes;
  action: Actions;
  status: Status;
  requestDate: Date;
  resolvedAt: Date | null;
  moderationReason: string | null;
};

export default function RequestsList() {
  const t = useTranslations("Requests");
  const locale = useLocale();
  const entityTypeLabels: Record<typeof entityTypesEnum.enumValues[number], string> = useMemo(() => ({
    words: t("entityTypes.words"),
    meanings: t("entityTypes.meanings"),
    roots: t("entityTypes.roots"),
    related_words: t("entityTypes.related_words"),
    related_phrases: t("entityTypes.related_phrases"),
    part_of_speechs: t("entityTypes.part_of_speechs"),
    examples: t("entityTypes.examples"),
    authors: t("entityTypes.authors"),
    word_attributes: t("entityTypes.word_attributes"),
    meaning_attributes: t("entityTypes.meaning_attributes"),
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


  const router = useProgressRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { page, limit, entityType, action, status } = readRequestListParams(searchParams);
  const hasFilters = entityType !== "all" || action !== "all" || status !== "all";
  const changeParams = useCallback((changes: RequestListChanges, replace = false) => {
    const query = updateRequestListParams(searchParams.toString(), changes);
    router[replace ? "replace" : "push"](`${pathname}?${query}`, { scroll: false });
  }, [pathname, router, searchParams]);
  const { data, isLoading, isFetching, isPlaceholderData, isError, error, refetch } = api.request.getUserRequests.useQuery({
    page, limit,
    entityType: entityType === "all" ? undefined : entityType,
    action: action === "all" ? undefined : action,
    status: status === "all" ? undefined : status,
  }, { placeholderData: keepPreviousData });
  // Authorization errors supersede retained query data, including rows and pagination.
  const unavailable = isError && (error?.data?.code === "UNAUTHORIZED" || error?.data?.code === "FORBIDDEN");
  const visibleData = unavailable ? undefined : data;
  const totalPages = Math.max(1, visibleData?.pagination.totalPages ?? 1);
  const totalCount = Number(visibleData?.pagination.totalCount ?? 0);
  const loadError = requestErrorKey(error?.data?.code, "errorLoading");
  useEffect(() => {
    // A deletion or another tab can reduce the last page. Never clamp placeholder data.
    if (visibleData && !isError && !isFetching && !isPlaceholderData && page > totalPages) changeParams({ page: totalPages }, true);
  }, [visibleData, isError, isFetching, isPlaceholderData, page, totalPages, changeParams]);

  const dateLabel = useCallback((value: Date | null) => {
    const date = requestDate(value, locale);
    return date ? <time dateTime={date.dateTime} title={date.title}>{date.relative}</time> : t("details.unknownDate");
  }, [locale, t]);

  const renderCell = useCallback((request: Row, columnKey: React.Key) => {
    switch (columnKey) {
      case "entityType": return entityTypeLabels[request.entityType] || request.entityType;
      case "action": return <div className="flex min-h-11 items-center">
        <Chip radius="md" color={actionColors[request.action]} variant="flat" className="shrink-0 whitespace-nowrap">{actionLabels[request.action]}</Chip>
      </div>;
      case "status": return <div className="flex min-h-11 items-center gap-1">
        <Chip radius="md" color={statusColors[request.status]} variant="flat" className="shrink-0 whitespace-nowrap">{statusLabels[request.status]}</Chip>
        {request.status !== "pending" && <Tooltip content={<div className="max-w-72 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm">
          <p><strong>{t("details.resolvedAtLabel")}: </strong>{dateLabel(request.resolvedAt)}</p>
          <p className="mt-2"><strong>{t("details.moderationReason")}: </strong><bdi>{request.moderationReason || t("details.noReason")}</bdi></p>
        </div>}>
          <Button isIconOnly size="sm" variant="light" className="h-11 w-11 min-w-11 shrink-0 text-foreground"
            aria-label={t("buttons.resolutionSpecific", { id: request.key })}><Info aria-hidden className="h-4 w-4" /></Button>
        </Tooltip>}
      </div>;
      case "date": return dateLabel(request.requestDate);
      case "actions": return <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link className="inline-flex min-h-11 items-center rounded-md px-2 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={t("buttons.viewSpecific", { id: request.key })}
          href={{ pathname: "/my-requests/[id]", params: { id: String(request.key) } }}>
          {t("buttons.viewDetails")}
        </Link>
        {request.status === "pending" && !isError && <CancelRequestButton requestId={request.key} compact />}
      </div>;
      default: return null;
    }
  }, [t, actionColors, actionLabels, entityTypeLabels, statusColors, statusLabels, dateLabel, isError]);

  const rows = (visibleData?.requests ?? []).map(request => ({ ...request, key: request.id }));
  const columns = [
    { key: "entityType", label: t("tableColumns.entityType") },
    { key: "action", label: t("tableColumns.action") },
    { key: "status", label: t("tableColumns.status") },
    { key: "date", label: t("tableColumns.date") },
    { key: "actions", label: t("tableColumns.actions") },
  ];
  const selectClasses = { trigger: "h-12 min-h-12 px-3", label: "text-sm", value: "text-base", base: "min-w-0" };
  return <div className="container mx-auto w-full min-w-0 px-4 py-8 sm:px-6">
    <h1 className="mb-6 text-2xl font-bold">{t("myRequests")}</h1>
    <CustomTable columns={columns} items={rows} renderCell={renderCell}
      aria-label={t("myRequests")}
      classNames={{ table: rows.length > 0 ? "min-w-[780px]" : "w-full", td: "py-2 align-middle whitespace-normal", th: "whitespace-nowrap" }}
      loadingState={isLoading ? "loading" : undefined}
      emptyContent={isError ? <div role="alert" className="space-y-3 py-6">
        <p>{t(loadError)}</p><Button variant="flat" className="min-h-11" isLoading={isFetching} onPress={() => void refetch()}>{t("buttons.retry")}</Button>
      </div> : <div className="space-y-3 py-6">
        <p>{t(hasFilters ? "messages.noMatchingRequests" : "messages.noRequests")}</p>
        {hasFilters && <Button variant="flat" className="min-h-11" onPress={() => changeParams({ entityType: "all", action: "all", status: "all" })}>{t("buttons.clearFilters")}</Button>}
      </div>}
      topContent={<div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CustomSelect options={entityTypeLabels} label={t("entityTypes.title")} labelPlacement="outside" size="md" classNames={selectClasses}
            showAllOption allOptionLabel={t("entityTypes.all")} disallowEmptySelection selectedKeys={[entityType]}
            onChange={event => changeParams({ entityType: event.target.value })} />
          <CustomSelect options={actionLabels} label={t("actions.title")} labelPlacement="outside" size="md" classNames={selectClasses}
            showAllOption allOptionLabel={t("actions.all")} disallowEmptySelection selectedKeys={[action]}
            onChange={event => changeParams({ action: event.target.value })} />
          <CustomSelect options={statusLabels} label={t("status.title")} labelPlacement="outside" size="md" classNames={selectClasses}
            showAllOption allOptionLabel={t("status.all")} disallowEmptySelection selectedKeys={[status]}
            onChange={event => changeParams({ status: event.target.value })} />
          <CustomSelect options={Object.fromEntries(requestPageSizes.map(size => [String(size), String(size)]))}
            label={t("messages.itemsPerPage")} labelPlacement="outside" size="md" classNames={selectClasses}
            disallowEmptySelection selectedKeys={[String(limit)]} onChange={event => changeParams({ per_page: Number(event.target.value) })} />
        </div>
        {isError && rows.length > 0 && <div role="alert" className="flex flex-wrap items-center gap-3">
          <p>{t(loadError)}</p><Button size="sm" variant="flat" className="min-h-11" isLoading={isFetching} onPress={() => void refetch()}>{t("buttons.retry")}</Button>
        </div>}
      </div>}
      bottomContent={<div className="flex min-w-0 flex-col items-center gap-3 py-2" aria-busy={isFetching}>
        {!isLoading && !isError && <p role="status" className="text-sm tabular-nums text-muted-foreground">{t("messages.count", { count: totalCount })}</p>}
        {totalCount > 0 && <CustomPagination total={totalPages} page={Math.min(page, totalPages)} isDisabled={isFetching}
          isCompact={false} disableCursorAnimation classNames={{ wrapper: "max-w-full flex-wrap justify-center" }}
          aria-label={t("messages.pagination")}
          getItemAriaLabel={value => value === "prev" ? t("messages.previous") : value === "next" ? t("messages.next")
            : value === "dots" ? t("messages.jumpPages") : value === "first" ? t("messages.firstPage") : value === "last" ? t("messages.lastPage")
              : t("messages.pageButton", { page: String(value ?? "") })}
          onChange={nextPage => changeParams({ page: nextPage })} />}
      </div>}
    />
  </div>;
}
