"use client"
import { api } from "@/src/trpc/react";
import {
  Chip,
  Card,
  CardBody,
  Button,
  Tooltip,
} from "@heroui/react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { EntityTypes, Actions, Status, entityTypesEnum, actionsEnum, statusEnum } from "@/db/schema/requests";
import { Link } from "@/src/i18n/routing";
import { keepPreviousData } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { tr } from "date-fns/locale";
import { useSnapshot } from "valtio";
import { preferencesState } from "@/src/store/preferences";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomPagination } from "@/src/components/customs/heroui/custom-pagination";
import { CustomSelect, OptionsMap } from "@/src/components/customs/heroui/custom-select";
import { Info } from "lucide-react";

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

  const requestsPerPageOptions = [
    { label: "5", key: "5" },
    { label: "10", key: "10" },
    { label: "20", key: "20" },
    { label: "50", key: "50" }
  ];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial values from URL params
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialPerPage = Number(searchParams.get('per_page')) || 10;
  const initialEntityType = searchParams.get('entityType') as EntityTypes | "all" || "all";
  const initialAction = searchParams.get('action') as Actions | "all" || "all";
  const initialStatus = searchParams.get('status') as Status | "all" || "all";

  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [requestsPerPage, setRequestsPerPage] = useState<number>(initialPerPage);
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityTypes | "all">(initialEntityType);
  const [actionFilter, setActionFilter] = useState<Actions | "all">(initialAction);
  const [statusFilter, setStatusFilter] = useState<Status | "all">(initialStatus);

  const { isBlurEnabled } = useSnapshot(preferencesState);

  // Update URL when parameters change
  const updateQueryParams = useCallback((params: {
    page?: number;
    per_page?: number;
    entityType?: string;
    action?: string;
    status?: string;
  }) => {
    const newSearchParams = new URLSearchParams(searchParams);

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newSearchParams.set(key, value.toString());
      } else {
        newSearchParams.delete(key);
      }
    });

    router.push(`${pathname}?${newSearchParams.toString()}`);
  }, [pathname, router, searchParams]);

  // Handle parameter changes
  useEffect(() => {
    updateQueryParams({
      page: pageNumber,
      per_page: requestsPerPage,
      entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
      action: actionFilter !== "all" ? actionFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined
    });
  }, [pageNumber, requestsPerPage, entityTypeFilter, actionFilter, statusFilter, updateQueryParams]);

  const { data, isLoading, isError } = api.request.getUserRequests.useQuery({
    page: pageNumber,
    limit: requestsPerPage,
    entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
    action: actionFilter !== "all" ? actionFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  }, {
    placeholderData: keepPreviousData,
    // Prevent request when filters are invalid
    enabled: !(
      (entityTypeFilter !== "all" && !entityTypesEnum.enumValues.includes(entityTypeFilter as EntityTypes)) ||
      (actionFilter !== "all" && !actionsEnum.enumValues.includes(actionFilter as Actions)) ||
      (statusFilter !== "all" && !statusEnum.enumValues.includes(statusFilter as Status))
    )
  });

  const renderCell = useCallback((request: Row, columnKey: React.Key) => {
    switch (columnKey) {
      case "entityType":
        return entityTypeLabels[request.entityType] || request.entityType;
      case "action":
        return (
          <Chip color={actionColors[request.action]} variant="flat">
            {actionLabels[request.action] || request.action}
          </Chip>
        );
      case "status":
        return (
          <div className="flex items-center gap-2">
            <Chip color={statusColors[request.status]} variant="flat">
              {statusLabels[request.status] || request.status}
            </Chip>
            {request.status !== "pending" && (
              <Tooltip
                content={
                  <div className="text-xs">
                    <div>
                      <span className="font-medium">{t("details.resolvedAtLabel")}:</span>
                      <span className="ml-1">
                        {request.resolvedAt
                          ? formatDistanceToNow(new Date(request.resolvedAt), {
                            addSuffix: true,
                            locale: locale === 'tr' ? tr : undefined,
                          })
                          : t("details.unknownDate")}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="font-medium">{t("details.moderationReason")}:</span>
                      <span className="ml-1">{request.moderationReason || t("details.noReason")}</span>
                    </div>
                  </div>
                }
              >
                <Info className="h-4 w-4 text-default-500" />
              </Tooltip>
            )}
          </div>
        );
      case "date":
        return request.requestDate
          ? formatDistanceToNow(new Date(request.requestDate), {
            addSuffix: true,
            locale: locale === 'tr' ? tr : undefined
          })
          : "Unknown";
      case "actions":
        return (
          <div className="flex items-center gap-2">
            <Link
              className="text-secondary hover:underline"
              href={{
                pathname: "/my-requests/[id]",
                params: {
                  id: request.key.toString(),
                },
              }}
            >
              {t("buttons.viewDetails")}
            </Link>
            {request.status === "pending" && (
              <Button
                size="sm"
                color="danger"
                variant="light"
              >
                {t("buttons.cancel")}
              </Button>
            )}
          </div>
        );
      default:
        return null;
    }
  }, [actionColors, actionLabels, entityTypeLabels, statusColors, statusLabels, t]);

  if (isError) {
    return (
      <Card>
        <CardBody className="flex h-40 items-center justify-center">
          <p className="text-center text-danger">{t("messages.errorLoading")}</p>
        </CardBody>
      </Card>
    );
  }

  const { requests, pagination } = data || { requests: [], pagination: { totalPages: 1, totalCount: 0 } };
  const totalPageNumber = pagination?.totalPages || 1;

  const columns = [
    { key: "entityType", label: t("tableColumns.entityType") },
    { key: "action", label: t("tableColumns.action") },
    { key: "status", label: t("tableColumns.status") },
    { key: "date", label: t("tableColumns.date") },
    { key: "actions", label: t("tableColumns.actions") },
  ];

  type Row = (typeof rows)[0];
  const rows = requests.map((request) => ({
    key: request.id,
    entityType: request.entityType,
    entityId: request.entityId,
    action: request.action,
    status: request.status,
    requestDate: request.requestDate,
    resolvedAt: request.resolvedAt,
    moderationReason: request.moderationReason,
  }));

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("myRequests")}</h1>
      <CustomTable
        columns={columns}
        items={rows}
        renderCell={renderCell}
        loadingState={isLoading ? 'loading' : undefined}
        topContent={
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <CustomSelect
                options={entityTypeLabels}
                label={t("entityTypes.title")}
                showAllOption
                allOptionLabel={t("entityTypes.all")}
                selectedKeys={[entityTypeFilter]}
                onChange={(e) => {
                  const value = e.target.value;
                  setEntityTypeFilter(value === "all" ? "all" : value as EntityTypes);
                }}
              />
              <CustomSelect
                options={actionLabels}
                label={t("actions.title")}
                showAllOption
                allOptionLabel={t("actions.all")}
                selectedKeys={[actionFilter]}
                onChange={(e) => {
                  const value = e.target.value;
                  setActionFilter(value === "all" ? "all" : value as Actions);
                }}
              />
              <CustomSelect
                options={statusLabels}
                label={t("status.title")}
                showAllOption
                allOptionLabel={t("status.all")}
                selectedKeys={[statusFilter]}
                onChange={(e) => {
                  const value = e.target.value;
                  setStatusFilter(value === "all" ? "all" : value as Status);
                }}
              />
              <CustomSelect
                options={requestsPerPageOptions.reduce((acc, option) => {
                  acc[option.key] = option.label;
                  return acc;
                }, {} as OptionsMap)}
                label={t("messages.itemsPerPage")}
                selectedKeys={[requestsPerPage.toString()]}
                onChange={(e) => {
                  setRequestsPerPage(parseInt(e.target.value));
                  setPageNumber(1); // Reset to first page on requests per page change
                }}
                className="w-full ml-auto"
                color="primary"
                variant="bordered"
              />
            </div>
          </div>
        }
        bottomContent={
          <CustomPagination
            total={totalPageNumber}
            initialPage={pageNumber}
            page={pageNumber}
            onChange={(page) => {
              setPageNumber(page);
            }}
          />
        }
      />
    </div>
  );
}
