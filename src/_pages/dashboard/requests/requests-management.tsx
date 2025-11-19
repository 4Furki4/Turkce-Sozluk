"use client"
import { api } from "@/src/trpc/react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Chip,
  Select,
  SelectItem, User
} from "@heroui/react";
import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { EntityTypes, Actions } from "@/db/schema/requests";
import { Link } from "@/src/i18n/routing";
import { Pagination } from "@heroui/pagination";
import { keepPreviousData } from "@tanstack/react-query";

const entityTypeLabels: Record<EntityTypes, string> = {
  words: "Words",
  meanings: "Meanings",
  roots: "Roots",
  related_words: "Related Words",
  related_phrases: "Related Phrases",
  part_of_speechs: "Parts of Speech",
  examples: "Examples",
  authors: "Authors",
  word_attributes: "Word Attributes",
  meaning_attributes: "Meaning Attributes",
  pronunciations: "Pronunciations",
  misspellings: "Misspellings",
  galatimeshur: "Galatimeshur",
};

const actionLabels: Record<Actions, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
};

const actionColors: Record<Actions, "primary" | "warning" | "danger"> = {
  create: "primary",
  update: "warning",
  delete: "danger",
};

const requestsPerPageOptions = [
  { label: "5", key: "5" },
  { label: "10", key: "10" },
  { label: "20", key: "20" },
  { label: "50", key: "50" }
];

export default function RequestsManagement() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial values from URL params
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialPerPage = Number(searchParams.get('per_page')) || 10;
  const initialEntityType = searchParams.get('entityType') as EntityTypes | "all" || "all";
  const initialAction = searchParams.get('action') as Actions | "all" || "all";

  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [requestsPerPage, setRequestsPerPage] = useState<number>(initialPerPage);
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityTypes | "all">(initialEntityType);
  const [actionFilter, setActionFilter] = useState<Actions | "all">(initialAction);

  // Update URL when parameters change
  const updateQueryParams = useCallback((params: {
    page?: number;
    per_page?: number;
    entityType?: string;
    action?: string;
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
      action: actionFilter !== "all" ? actionFilter : undefined
    });
  }, [pageNumber, requestsPerPage, entityTypeFilter, actionFilter, updateQueryParams]);

  const { data, isLoading, isError } = api.request.getAllPendingRequests.useQuery({
    page: pageNumber,
    limit: requestsPerPage,
    entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
    action: actionFilter !== "all" ? actionFilter : undefined,
  }, {
    placeholderData: keepPreviousData
  });

  const renderCell = useCallback((request: Row, columnKey: React.Key) => {
    switch (columnKey) {
      case "user":
        return (
          <User
            name={request.userName || "Unknown User"}
            avatarProps={{ src: request.userImage || undefined }}
            description={request.userId}
          />
        );
      case "entityType":
        return entityTypeLabels[request.entityType] || request.entityType;
      case "action":
        return (
          <Chip color={actionColors[request.action]} variant="flat">
            {actionLabels[request.action] || request.action}
          </Chip>
        );
      case "date":
        return request.requestDate
          ? formatDistanceToNow(new Date(request.requestDate), {
            addSuffix: true,
          })
          : "Unknown";
      case "actions":
        return (
          <Link
            className="text-primary hover:underline"
            href={{
              pathname: `/dashboard/requests/[id]`,
              params: { id: request.id.toString() },
            }}
          >
            View Details
          </Link>
        );
      default:
        return null;
    }
  }, []);

  if (isError) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-center text-danger">Error loading requests</p>
      </div>
    );
  }

  const { requests, pagination } = data || { requests: [], pagination: { totalPages: 1, totalCount: 0 } };
  const totalPageNumber = pagination?.totalPages || 1;

  const columns = [
    { key: "user", label: "USER" },
    { key: "entityType", label: "ENTITY TYPE" },
    { key: "action", label: "ACTION" },
    { key: "date", label: "REQUEST DATE" },
    { key: "actions", label: "ACTIONS" },
  ];

  type Row = {
    id: number;
    userId: string;
    userName: string | null;
    userImage: string | null;
    entityType: EntityTypes;
    action: Actions;
    requestDate: Date | null;
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-2xl font-bold">Pending Requests</h1>
      <Table
        topContent={(
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                size="sm"
                label="Entity Type"
                selectedKeys={[entityTypeFilter]}
                onChange={(e) => setEntityTypeFilter(e.target.value as EntityTypes | "all")}
                className="w-full sm:w-48"
              >
                <>
                  <SelectItem key="all">All Types</SelectItem>
                  {Object.entries(entityTypeLabels).map(([key, label]) => (
                    <SelectItem key={key}>
                      {label}
                    </SelectItem>
                  ))}
                </>
              </Select>

              <Select
                size="sm"
                label="Action"
                selectedKeys={[actionFilter]}
                onChange={(e) => setActionFilter(e.target.value as Actions | "all")}
                className="w-full sm:w-36"
              >
                <>
                  <SelectItem key="all">All Actions</SelectItem>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <SelectItem key={key}>
                      {label}
                    </SelectItem>
                  ))}
                </>
              </Select>

              <Select
                label="Items per page"
                defaultSelectedKeys={[requestsPerPage.toString()]}
                size="sm"
                classNames={{
                  base: "ml-auto sm:max-w-64",
                }}
                onChange={(e) => {
                  setRequestsPerPage(parseInt(e.target.value));
                  setPageNumber(1); // Reset to first page on requests per page change
                }}
              >
                {requestsPerPageOptions.map((pageCount) => (
                  <SelectItem key={pageCount.key}>
                    {pageCount.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        )}
        aria-label="Pending requests table"
        classNames={{
          base: ["min-h-[300px]"],
        }}
        isStriped
        bottomContent={
          <Pagination
            isDisabled={totalPageNumber === undefined}
            classNames={{
              wrapper: ["mx-auto"]
            }}
            isCompact
            showControls
            total={totalPageNumber}
            initialPage={pageNumber}
            page={pageNumber}
            onChange={(page) => {
              setPageNumber(page);
            }}
          />
        }
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.key}>{column.label}</TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={(requests || [])}
          loadingContent={<Spinner />}
          loadingState={isLoading ? "loading" : "idle"}
          emptyContent={
            <div className="py-8 text-center">
              <p className="text-center text-gray-500">No pending requests found</p>
            </div>
          }
        >
          {(request) => (
            <TableRow key={request.id}>
              {(columnKey) => (
                <TableCell>{renderCell(request, columnKey)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
