"use client";

import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  useDisclosure,
  Spinner,
  Button,
  Chip,
  Pagination,
  Select,
  SelectItem,
  Input,
} from "@heroui/react";
import { Edit3, Plus, Trash2, Search } from "lucide-react";
import { api } from "@/src/trpc/react";
import { Link } from "@/src/i18n/routing";
import { usePathname, useSearchParams } from "next/navigation";
import { useProgressRouter as useRouter } from "@/src/hooks/use-progress-router";
import { useTranslations } from "next-intl";
import { keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { format } from "date-fns";
import DeleteAnnouncementModal from "./delete-announcement-modal";

const itemsPerPageOptions = [
  { label: "5", key: "5" },
  { label: "10", key: "10" },
  { label: "20", key: "20" },
];

const statusOptions = [
  { label: "All", key: "all" },
  { label: "Draft", key: "draft" },
  { label: "Published", key: "published" },
  { label: "Archived", key: "archived" },
];

export default function AnnouncementsList() {
  const t = useTranslations("Dashboard.Announcements");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const status = (searchParams.get("status") || "all") as "all" | "draft" | "published" | "archived";
  const searchQuery = searchParams.get("search") || "";
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Delete modal state
  const { isOpen: isDeleteModalOpen, onOpen: onOpenDeleteModal, onClose: onCloseDeleteModal } = useDisclosure();
  const [announcementToDelete, setAnnouncementToDelete] = useState<{ id: number; slug: string } | null>(null);

  // Fetch announcements
  const { data, isLoading, isError } = api.admin.announcements.listAnnouncementsAdmin.useQuery(
    {
      page,
      limit,
      status,
      search: debouncedSearch,
      orderBy: "createdAt",
      orderDirection: "desc",
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  // Update URL with new query params
  const updateQueryParams = (params: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    router.push(`${pathname}?${newParams.toString()}`);
  };

  // Handle pagination change
  const handlePageChange = (newPage: number) => {
    updateQueryParams({ page: newPage.toString() });
  };

  // Handle items per page change
  const handleLimitChange = (newLimit: string) => {
    updateQueryParams({ limit: newLimit, page: "1" });
  };

  // Handle status filter change
  const handleStatusChange = (newStatus: string) => {
    updateQueryParams({ status: newStatus, page: "1" });
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateQueryParams({ search: e.target.value, page: "1" });
  };

  // Handle delete button click
  const handleDeleteClick = (announcement: { id: number; slug: string }) => {
    setAnnouncementToDelete(announcement);
    onOpenDeleteModal();
  };

  // Get status chip color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "success";
      case "draft":
        return "warning";
      case "archived":
        return "danger";
      default:
        return "default";
    }
  };

  // Format date
  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return format(new Date(date), "MMM dd, yyyy");
  };

  // Define columns for the table
  const columns = [
    { key: "slug", label: t("columns.slug") },
    { key: "status", label: t("columns.status") },
    { key: "publishedAt", label: t("columns.publishedAt") },
    { key: "createdAt", label: t("columns.createdAt") },
    { key: "actions", label: t("columns.actions") },
  ];

  // Transform data for the table
  const rows = data?.items.map((announcement) => ({
    key: announcement.id.toString(),
    id: announcement.id,
    slug: announcement.slug,
    status: announcement.status,
    publishedAt: announcement.publishedAt,
    createdAt: announcement.createdAt,
  })) || [];

  // Calculate total pages
  const totalPageNumber = data?.meta.totalPages || 1;

  // Render cell content based on column key
  const renderCell = (item: any, columnKey: React.Key) => {
    switch (columnKey) {
      case "slug":
        return (
          <Link
            href={{
              pathname: "/dashboard/announcements/[id]/edit",
              params: { id: item.id.toString() }
            }}
            className="text-primary hover:underline"
          >
            {item.slug}
          </Link>
        );
      case "status":
        return (
          <Chip
            color={getStatusColor(item.status) as any}
            size="sm"
          >
            {t(`statuses.${item.status}`)}
          </Chip>
        );
      case "publishedAt":
        return formatDate(item.publishedAt);
      case "createdAt":
        return formatDate(item.createdAt);
      case "actions":
        return (
          <div className="flex justify-center gap-2">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              as={Link}
              href={{
                pathname: "/dashboard/announcements/[id]/edit",
                params: { id: item.id.toString() }
              } as any}
              aria-label={t("edit")}
            >
              <Edit3 size={16} />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              color="danger"
              onPress={() => handleDeleteClick({ id: item.id, slug: item.slug })}
              aria-label={t("delete")}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button
          color="primary"
          as={Link}
          href="/dashboard/announcements/new"
          startContent={<Plus size={16} />}
        >
          {t("createNew")}
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:w-72">
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={handleSearchChange}
              startContent={<Search size={16} />}
            />
          </div>
          <div className="flex gap-2">
            <Select
              label={t("status")}
              selectedKeys={[status]}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-32"
            >
              {statusOptions.map((option) => (
                <SelectItem key={option.key}>
                  {t(`statuses.${option.key}`)}
                </SelectItem>
              ))}
            </Select>
            <Select
              label={t("itemsPerPage")}
              selectedKeys={[limit.toString()]}
              onChange={(e) => handleLimitChange(e.target.value)}
              className="w-36"
            >
              {itemsPerPageOptions.map((option) => (
                <SelectItem key={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        <Table
          aria-label={t("tableAriaLabel")}
          isStriped
          classNames={{
            base: "min-h-[300px]",
          }}
          bottomContent={
            <Pagination
              isDisabled={totalPageNumber === undefined}
              classNames={{
                wrapper: "mx-auto",
              }}
              isCompact
              showControls
              total={totalPageNumber}
              initialPage={1}
              page={page}
              onChange={handlePageChange}
            />
          }
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn
                key={column.key}
                align={column.key === "actions" ? "center" : "start"}
              >
                {column.label}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody
            items={rows}
            loadingContent={<Spinner />}
            loadingState={isLoading ? "loading" : "idle"}
            emptyContent={isError ? <div className="text-danger">{t("error")}</div> : t("noAnnouncements")}
          >
            {(item) => (
              <TableRow key={item.key}>
                {(columnKey) => (
                  <TableCell>{renderCell(item, columnKey)}</TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteAnnouncementModal
        isOpen={isDeleteModalOpen}
        onClose={onCloseDeleteModal}
        announcement={announcementToDelete}
      />
    </div>
  );
}
