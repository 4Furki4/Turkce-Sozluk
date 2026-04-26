"use client"
import AddWordAttributeModal from '@/src/components/customs/modals/add-word-attribute';
import { EditWordForm } from '@/types'
import { Button, Select, Selection, SelectItem, useDisclosure } from "@heroui/react"
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Control, Controller, UseFormSetValue } from 'react-hook-form'

export default function WordAttributesInput({
    control,
    wordAttributes,
    selectedWordAttributes,
    setFieldValue
}: {
    control: Control<EditWordForm>,
    wordAttributes: {
        id: number,
        attribute: string
    }[],
    selectedWordAttributes: {
        attribute_id: number;
        attribute: string;
    }[],
    setFieldValue: UseFormSetValue<EditWordForm>
}) {
    const selecetedKeys = selectedWordAttributes.map(wordAttribute => wordAttribute.attribute_id.toString())
    const [values, setValues] = useState<Selection>(new Set(selecetedKeys));

    const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedAttributes = e.target.value.split(",").filter((val) => val)
        setValues(() => new Set(selectedAttributes))
        setFieldValue("attributes", selectedAttributes)
    };
    const { isOpen, onOpenChange, onOpen, onClose } = useDisclosure()
    return (
        <>
            <AddWordAttributeModal isOpen={isOpen} onOpenChange={onOpenChange} onClose={onClose} isDismissable={false} />
            <Controller
                name={`attributes`}
                control={control}
                rules={{
                    min: {
                        value: 1,
                        message: "Please select at least one attribute"
                    }
                }}
                render={({ field }) => (
                    <Select
                        labelPlacement='outside'
                        radius='md'
                        selectedKeys={values}
                        items={wordAttributes}
                        as={"div"}
                        {...field}
                        endContent={(
                            <Button
                                isIconOnly
                                onPress={onOpen}
                                variant='light'
                            // color='primary'
                            >
                                <div className='sr-only'>
                                    Add new word attribute
                                </div>
                                <Plus></Plus>
                            </Button>
                        )}
                        onChange={handleSelectionChange}
                        placeholder='Please select an attribute'
                        label="Attribute"
                        defaultSelectedKeys={selecetedKeys}
                        selectionMode='multiple'>
                        {wordAttributes?.map((wordAttribute => (
                            <SelectItem textValue={wordAttribute.attribute} key={wordAttribute.id}>
                                {wordAttribute.attribute}
                            </SelectItem>
                        )))}
                    </Select>
                )}
            />
        </>
    )
}
