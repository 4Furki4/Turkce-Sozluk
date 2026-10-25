import { Button, SelectItem, Tooltip, useDisclosure } from "@heroui/react";
import { Control, Controller } from "react-hook-form";
import { WordEditRequestForm } from "../word-edit-request";
import { FileClock, Plus } from "lucide-react";
import NewWordAttributeRequestModal from "./new-word-attribute-request-inline";
import { useTranslations } from "next-intl";
import { CustomSelect } from "../../heroui/custom-flexable-select";
export default function WordAttributesRequestInput({
  control,
  wordAttributes,
  wordAttributesIsLoading,
}: {
  control: Control<WordEditRequestForm>;
  wordAttributes:
    | (
        | {
            id: number;
            attribute: string;
          }
        | {
            id: number;
            attribute: string;
          }
      )[]
    | undefined;
  wordAttributesIsLoading: boolean;
}) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const t = useTranslations();
  return (
    <div className="min-w-0 space-y-3">
      <Controller
        name="attributes"
        control={control}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <CustomSelect
            items={wordAttributes || []}
            label={t("WordAttribute")}
            placeholder={t("SelectAttributes")}
            labelPlacement="outside"
            size="lg"
            classNames={{
              base: "sm:max-w-none",
              trigger: "h-12 min-h-12",
              mainWrapper: "h-auto min-h-12",
            }}
            selectionMode="multiple"
            selectedKeys={new Set(value)}
            onSelectionChange={(keys) => onChange(Array.from(keys))}
            isLoading={wordAttributesIsLoading}
            isInvalid={!!error}
            errorMessage={error?.message}
            className="w-full"
            as={"div"}
            endContent={
              <Button
                isIconOnly
                className="h-11 min-w-11"
                onPress={onOpen}
                variant="light"
                // color='primary'
              >
                <div className="sr-only">{t("AddNewWordAttribute")}</div>
                <Plus></Plus>
              </Button>
            }
          >
            {(attr) => (
              <SelectItem
                endContent={
                  attr.id < 0 ? (
                    <Tooltip content={t("Requests.RequestedAttributeByYou")}>
                      <FileClock className="text-warning" />
                    </Tooltip>
                  ) : (
                    ""
                  )
                }
                key={attr.id.toString()}
              >
                {attr.attribute}
              </SelectItem>
            )}
          </CustomSelect>
        )}
      />
      <NewWordAttributeRequestModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onClose={onClose}
      />
    </div>
  );
}
