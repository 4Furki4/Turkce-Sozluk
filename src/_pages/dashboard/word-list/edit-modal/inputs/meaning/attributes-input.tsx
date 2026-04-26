import AddMeaningAttributeModal from '@/src/components/customs/modals/add-meaning-attribute'
import { EditWordForm } from '@/types'
import { Button, Select, Selection, SelectItem, useDisclosure } from "@heroui/react"
import { Plus } from 'lucide-react'
import React from 'react'
import { Control, Controller, UseFormSetValue } from 'react-hook-form'

export default function AttributesInput({
    control,
    attributes,
    selectedAttributes,
    setFieldValue,
    index,
}: {
    control: Control<EditWordForm>
    attributes: {
        id: string,
        attribute: string
    }[]
    selectedAttributes: string[] | undefined
    setFieldValue: UseFormSetValue<EditWordForm>
    index: number
}) {
    const { isOpen, onOpenChange, onOpen, onClose } = useDisclosure()
    const [values, setValues] = React.useState<Selection>(new Set(selectedAttributes));
    const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedAttributes = e.target.value.split(",").filter((val) => val)
        setValues(() => new Set(selectedAttributes))
        setFieldValue(`meanings.${index}.attributes`, selectedAttributes)
    };
    return (
        <Controller control={control} name={`meanings.${index}.attributes`} render={({ field }) => (
            <>
                <AddMeaningAttributeModal isOpen={isOpen} onClose={onClose} onOpenChange={onOpenChange} isDismissable={false} />
                <Select
                    as={"div"}
                    {...field}
                    onChange={handleSelectionChange}
                    selectedKeys={values}
                    selectionMode='multiple'
                    radius='md'
                    label="Attributes"
                    labelPlacement='outside'
                    placeholder='You can select an attribute for this meaning'
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
                >
                    {
                        attributes.map((att) => (
                            <SelectItem key={att.id}>
                                {att.attribute}
                            </SelectItem>
                        ))
                    }
                </Select>
            </>
        )}
        />
    )
}
