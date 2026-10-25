"use client"
import React, { useCallback } from 'react'
import {
    Button,
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    useDisclosure,
    Spinner,
    User,
} from "@heroui/react";
import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownSection,
    DropdownItem,
    Link as NextUILink
} from "@heroui/react";
import { MoreVertical, Trash2 } from 'lucide-react';
import { api } from '@/src/trpc/react';
import { CustomPagination } from "@/src/components/customs/heroui/custom-pagination";
import { Select, SelectItem } from "@heroui/select";
import { rolesEnum, SelectUser } from '@/db/schema/users';
import { Link } from '@/src/i18n/routing';
import { useTaskMenuLinks } from "@/src/components/task-pages/task-link";
import { useListState } from "@/src/hooks/use-list-state";
import UserDeleteModal from './user-delete-modal';

import { keepPreviousData } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

const userPerPageOptions = [
    {
        label: "5",
        key: "5"
    },
    {
        label: "10",
        key: "10"
    },
    {
        label: "20",
        key: "20"
    },
    {
        label: "50",
        key: "50"
    }
]
const roles = rolesEnum.enumValues
export default function UserList(
    {
        users,
        userCount,
    }:
        {
            users: SelectUser[],
            userCount: number | undefined
        }
) {
    const taskMenuLink = useTaskMenuLinks();
    const t = useTranslations('Dashboard.UserList');
    const actionsT = useTranslations('Dashboard.Columns');
    const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onOpenChange: onDeleteModalChange } = useDisclosure();
    const [selectedUser, setSelectedUser] = React.useState<{
        userId?: string | null;
        name?: string | null;
        role?: typeof roles[number];
    }>({ userId: "", name: "", role: undefined });
    const [list, setList] = useListState({ page: 1, size: 10 });
    const pageNumber = list.page; const usersPerPage = list.size;
    const setPageNumber = (page: number) => setList(old => ({ ...old, page }));
    const setUsersPerPage = (size: number) => setList(old => ({ ...old, page: 1, size }));
    const usersCountQuery = api.user.getUserCount.useQuery(undefined, {
        initialData: userCount,
    });
    const totalPageNumber = Math.max(1, Math.ceil((usersCountQuery.data ?? 0) / usersPerPage));
    const currentPage = Math.min(pageNumber, totalPageNumber);
    const skip = (currentPage - 1) * usersPerPage
    React.useEffect(() => {
        setPageNumber(currentPage);
    }, [currentPage]);
    const usersQuery = api.user.getUsers.useQuery({
        take: usersPerPage,
        skip
    }, {
        // The server only loaded the first ten users, not every pagination key.
        initialData: skip === 0 && usersPerPage === 10 ? users : undefined,
        placeholderData: keepPreviousData,
    })
    const getUserDisplayName = (user: Pick<SelectUser, "name" | "username" | "email" | "id">) =>
        user.name?.trim() || user.username?.trim() || user.email || user.id;

    type Row = (typeof rows)[0];
    const rows = (usersQuery.data ?? []).map((user) => {
        const displayName = getUserDisplayName(user);

        return {
            name: displayName,
            username: user.username,
            key: user.id,
            src: user.image,
            role: user.role
        };
    });
    const columns = [
        {
            key: "name",
            label: "Name",
        },
        {
            key: "role",
            label: "Role"
        },
        {
            key: "actions",
            label: "Actions",
        },
    ];
    const renderCell = useCallback((item: Row, columnKey: React.Key) => {
        const cellValue = item[columnKey as keyof Row];
        switch (columnKey) {
            case "actions":
                return (
                    <Dropdown>
                        <DropdownTrigger key={cellValue} className="flex justify-around items-center">
                            <Button isIconOnly variant="light" className="ml-auto h-11 min-w-11" aria-label={actionsT("Actions")}>
                                <MoreVertical aria-description="more action button" />
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            onAction={(key) => {
                                if (key === "Delete") {
                                    setSelectedUser({
                                        userId: item.key,
                                        name: item.name,
                                        role: item.role
                                    });
                                    onDeleteModalOpen();
                                }


                            }}
                        >
                            <DropdownSection title={"Actions"}>
                                <DropdownItem
                                    key={"Delete"}
                                    startContent={<Trash2 />}
                                    color={"danger"}
                                >
                                    Delete
                                </DropdownItem>
                                <DropdownItem key="Edit" textValue="Edit Role" {...taskMenuLink({ pathname: "/dashboard/user-list/[userId]/role", params: { userId: item.key } })}> Edit Role</DropdownItem>
                                <DropdownItem key="AssignBadge" textValue="Assign Badge" {...taskMenuLink({ pathname: "/dashboard/user-list/[userId]/badges", params: { userId: item.key } })}> Assign Badge</DropdownItem>
                            </DropdownSection>
                        </DropdownMenu>
                    </Dropdown>
                );
            case "name":
                return (
                    <User name={
                        <NextUILink target='_blank' as={Link} href={`/profile/${item.key}`}>
                            {item.name}
                        </NextUILink>
                    }
                        description={item.username ? `@${item.username}` : undefined
                        } avatarProps={{
                            name: item.name,
                            src: item.src ?? undefined
                        }} />
                );
            default:
                return cellValue;
        }
    }, [taskMenuLink, onDeleteModalOpen, actionsT]);
    return (
        <>
            <Table topContent={
                <div className="flex gap-4">
                    <Select label={t('usersPerPage')} selectedKeys={[String(usersPerPage)]}
                        disallowEmptySelection
                        size="sm"
                        classNames={{
                            base: "ml-auto max-w-64",
                        }} onChange={(e) => {
                            const nextPageSize = Number(e.target.value);
                            if (!userPerPageOptions.some((option) => Number(option.key) === nextPageSize)) return;
                            setUsersPerPage(nextPageSize);
                        }}>
                        {userPerPageOptions.map((pageCount) => (
                            <SelectItem key={pageCount.key}>
                                {pageCount.label}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
            } bottomContent={
                <CustomPagination isDisabled={usersCountQuery.data === undefined} classNames={{
                    wrapper: ["mx-auto"]
                }} isCompact showControls total={totalPageNumber} page={currentPage} onChange={(page) => {
                    setPageNumber(page);
                }} />
            } classNames={{
                base: ["min-h-[300px] w-full min-w-0"],
                wrapper: ["min-w-0"],
            }} isStriped aria-label={t('tableLabel')}>
                <TableHeader columns={columns}>
                    {(column) => (
                        <TableColumn align={column.key === "actions" ? "end" : "start"} key={column.key}>{column.label}</TableColumn>
                    )}
                </TableHeader>
                <TableBody items={rows}
                    loadingContent={<Spinner />}
                    loadingState={
                        usersQuery.isFetching ? "loading" : "idle"
                    }
                >
                    {(item) => (
                        <TableRow key={item.key + item.name}>
                            {(columnKey) => (
                                <TableCell>{renderCell(item, columnKey)}</TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {
                isDeleteModalOpen ? <UserDeleteModal isOpen={isDeleteModalOpen} name={selectedUser.name!} onOpen={onDeleteModalOpen} onOpenChange={onDeleteModalChange} skip={skip} take={usersPerPage} userId={selectedUser.userId!} /> : null
            }

        </>
    )
}
