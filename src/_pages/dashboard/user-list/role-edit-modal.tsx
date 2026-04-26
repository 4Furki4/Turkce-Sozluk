"use client"
import { rolesEnum } from "@/db/schema/users";
import { api } from "@/src/trpc/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem, Selection, Button } from "@heroui/react";
import React from 'react'
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

const roles = rolesEnum.enumValues

export default function RoleEditModal({
    onOpenChange,
    isOpen,
    userId,
    selectedUserRole,
    skip,
    take
}: {
    onOpenChange: () => void,
    isOpen: boolean,
    userId?: string | null,
    selectedUserRole?: typeof roles[number],
    skip: number,
    take: number
}) {
    const utils = api.useUtils()
    const { control, handleSubmit, watch, setValue } = useForm<{
        role: typeof roles[number]
    }>()
    const [role, setRole] = React.useState<Selection>(new Set([selectedUserRole as string ?? '']));
    const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedRole = e.target.value
        setValue("role", selectedRole as typeof roles[number])
        setRole(() => new Set([selectedRole]))
    };
    const editRoleMutation = api.user.setRole.useMutation({
        async onSuccess(data) {
            toast.success(data.message)
            await utils.user.getUsers.refetch({
                skip,
                take
            })
        },
    })
    function onSubmit(data: { role: typeof roles[number] }) {
        if (userId) {
            editRoleMutation.mutate({
                selectedRole: data.role,
                userId: userId
            })
        }
    }
    return (
        <Modal radius="md" size="4xl" isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
            <ModalContent>
                {(onClose) => (
                    <>
                        <form onSubmit={handleSubmit(onSubmit)} className="pb-4">
                            <ModalHeader>
                                Edit Role
                            </ModalHeader>
                            <ModalBody>
                                <Controller name="role" control={control} render={({ field }) => (
                                    <Select
                                        defaultSelectedKeys={new Set([selectedUserRole as string])}
                                        {...field}
                                        selectedKeys={role}
                                        onChange={handleSelectionChange}
                                        label="Role"
                                        disallowEmptySelection
                                        radius="md"
                                        isRequired
                                        labelPlacement="outside">
                                        {roles.map((role => (
                                            <SelectItem key={role}>
                                                {role}
                                            </SelectItem>
                                        )))}
                                    </Select>
                                )} />
                            </ModalBody>
                            <ModalFooter>
                                <Button color="primary" variant="light" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" color="success" isDisabled={watch("role") === undefined}>
                                    Save
                                </Button>
                            </ModalFooter>
                        </form>
                    </>
                )}
            </ModalContent>
        </Modal>
    )
}
