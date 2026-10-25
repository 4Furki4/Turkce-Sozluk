"use client";

import { Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { Input } from "@heroui/react";
import { Button } from "@heroui/react";
import { useCallback, useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownSection, DropdownItem } from "@heroui/react";
import { MoreVertical, Trash2 } from 'lucide-react';
import { CustomPagination } from "@/src/components/customs/heroui/custom-pagination";
import { Select, SelectItem } from "@heroui/select";

import { useTaskMenuLinks, TaskButton } from "@/src/components/task-pages/task-link";
import { useTranslations } from "next-intl";
import { type ParameterType } from "@/src/components/task-pages/parameter-task";

interface DynamicParameterTableProps {
  columns: { key: string; label: string }[];
  data: Record<string, any>[];
  totalCount: number;
  setPageNumber: (page: number) => void;
  pageNumber: number;
  onSearch: (query: string) => void;
  search: string;
  taskType: ParameterType;
  onDelete: (item: any) => void;
  itemsPerPage: number;
  setItemsPerPage: (itemsPerPage: number) => void;
  isLoading: boolean;
}

const itemsPerPageOptions = [
  { label: "5", key: "5" },
  { label: "10", key: "10" },
  { label: "20", key: "20" },
  { label: "50", key: "50" }
];

export default function DynamicParameterTable({
  columns,
  data,
  totalCount,
  setPageNumber,
  pageNumber,
  onSearch,
  search,
  taskType,
  onDelete,
  itemsPerPage,
  setItemsPerPage,
  isLoading
}: DynamicParameterTableProps) {
  const taskMenuLink = useTaskMenuLinks();
  const t = useTranslations("TaskPage");
  const d = useTranslations("Dashboard");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  const handleDelete = (item: any) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      onDelete(itemToDelete);
    }
    setIsDeleteModalOpen(false);
  };

  type Row = (typeof data)[0];

  const renderCell = useCallback((item: Row, columnKey: React.Key) => {
    const cellValue = item[columnKey as keyof Row];
    switch (columnKey) {
      case "actions":
        return (
          <Dropdown>
            <DropdownTrigger key={cellValue} className="flex justify-around items-center">
              <Button isIconOnly variant="light" className="ml-auto h-11 min-w-11" aria-label={d("Columns.Actions")}>
                <MoreVertical aria-description="more action button" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              onAction={(key) => {
                if (key === "Delete") {
                  handleDelete(item);
                }

              }}
            >
              <DropdownSection title={d("Columns.Actions")}>
                <DropdownItem key="Edit" textValue={d("Actions.Edit")} {...taskMenuLink({ pathname: `/dashboard/dynamic-parameters/${taskType}/[id]/edit`, params: { id: item.id } })}>{d("Actions.Edit")}</DropdownItem>
                <DropdownItem key="Delete" startContent={<Trash2 />} color="danger">
                  {d("Actions.Delete")}
                </DropdownItem>
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>
        );
      default:
        return cellValue;
    }
  }, [taskType, taskMenuLink, d]);

  return (
    <div className="space-y-4">


      <div className="overflow-x-auto">
        <Table
          topContent={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Input
                type="text"
                aria-label={t("search")}
                label={t("search")} labelPlacement="outside" variant="bordered" size="lg"
                classNames={{ inputWrapper: "h-12 min-h-12" }}
                value={search}
                placeholder={t("search")}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full sm:max-w-xs"
              />
              <div className="flex flex-wrap items-end gap-3 sm:ml-auto">
                <Select
                  label={t("perPage")}
                  selectedKeys={[String(itemsPerPage)]}
                  labelPlacement="outside" variant="bordered" size="lg"
                  classNames={{ trigger: "h-12 min-h-12" }}
                  className="w-40"
                  onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                >
                  {itemsPerPageOptions.map((option) => (
                    <SelectItem key={option.key} >
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
                <TaskButton size="lg" color="primary" href={`/dashboard/dynamic-parameters/${taskType}/new`}>{t("newParameter")}</TaskButton>
              </div>
            </div>
          }
          bottomContent={
            <CustomPagination
              isCompact
              showControls
              page={pageNumber}
              isDisabled={totalPages === undefined}
              total={totalPages ?? 1}
              initialPage={1}
              onChange={async (page) => setPageNumber(page)}
              classNames={{
                wrapper: ["mx-auto"]
              }}
            />
          }
          classNames={{
            base: ["min-h-[300px]"],
          }}
          isStriped
        >
          <TableHeader columns={[...columns]}>
            {(column) => (
              <TableColumn align={column.key === "actions" ? "end" : "start"} key={column.key}>
                {column.label}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody isLoading={isLoading} loadingContent={<Spinner />} items={data}>
            {data.map((item) => (
              <TableRow key={item.id}>
                {columns.map((column) => (
                  <TableCell key={`${item.id}-${column.key}`}>
                    {renderCell(item, column.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>



      <Modal isOpen={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Confirm Delete</ModalHeader>
              <ModalBody>Are you sure you want to delete this item?</ModalBody>
              <ModalFooter>
                <Button color="secondary" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="danger" onPress={confirmDelete}>
                  {d("Actions.Delete")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
