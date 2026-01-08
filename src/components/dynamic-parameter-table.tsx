"use client";

import { Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { Input } from "@heroui/react";
import { Button } from "@heroui/react";
import { useCallback, useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownSection, DropdownItem } from "@heroui/react";
import { Edit3, MoreVertical, Trash2 } from 'lucide-react';
import { Pagination } from "@heroui/pagination";
import { Select, SelectItem } from "@heroui/select";

interface DynamicParameterTableProps {
  columns: { key: string; label: string }[];
  data: Record<string, any>[];
  totalCount: number;
  setPageNumber: (page: number) => void;
  pageNumber: number;
  onSearch: (query: string) => void;
  onAdd: () => void;
  onEdit: (item: any) => void;
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
  onAdd,
  onEdit,
  onDelete,
  itemsPerPage,
  setItemsPerPage,
  isLoading
}: DynamicParameterTableProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
              <button className="ml-auto">
                <MoreVertical aria-description="more action button" />
              </button>
            </DropdownTrigger>
            <DropdownMenu
              onAction={(key) => {
                if (key === "Delete") {
                  handleDelete(item);
                }
                if (key === "Edit") {
                  onEdit(item);
                }
              }}
            >
              <DropdownSection title="Actions">
                <DropdownItem key="Edit" startContent={<Edit3 />} color="warning">
                  Edit
                </DropdownItem>
                <DropdownItem key="Delete" startContent={<Trash2 />} color="danger">
                  Delete
                </DropdownItem>
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>
        );
      default:
        return cellValue;
    }
  }, []);

  return (
    <div className="space-y-4">


      <div className="overflow-x-auto">
        <Table
          topContent={
            <div className="grid grid-cols-2 items-center">
              <Input
                type="text"
                placeholder="Search..."
                onChange={(e) => onSearch(e.target.value)}
                className="max-w-xs"
              />
              <div className="flex gap-4 justify-end">
                <Select
                  label="Items per page"
                  defaultSelectedKeys={["10"]}
                  size="sm"
                  className="max-w-xs"
                  onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                >
                  {itemsPerPageOptions.map((option) => (
                    <SelectItem key={option.key} >
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
                <Button color="primary" onPress={onAdd}>Add New</Button>
              </div>
            </div>
          }
          bottomContent={
            <Pagination
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
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
