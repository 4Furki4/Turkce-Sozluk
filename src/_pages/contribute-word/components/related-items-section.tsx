"use client";

import { useState } from "react";
import { Button, Card, CardBody, Accordion, AccordionItem } from "@heroui/react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import AddRelatedItemModal from "./add-related-item-inline";

interface RelatedItem {
  id: number;
  name: string;
  relationType: string;
}

interface RelatedItemsSectionProps {
  relatedWords: RelatedItem[];
  relatedPhrases: RelatedItem[];
  onAddRelatedWord: (item: RelatedItem) => void;
  onRemoveRelatedWord: (id: number) => void;
  onAddRelatedPhrase: (item: RelatedItem) => void;
  onRemoveRelatedPhrase: (id: number) => void;
}

export default function RelatedItemsSection({
  relatedWords,
  relatedPhrases,
  onAddRelatedWord,
  onRemoveRelatedWord,
  onAddRelatedPhrase,
  onRemoveRelatedPhrase,
}: RelatedItemsSectionProps) {
  const t = useTranslations("ContributeWord");
  const tRelationTypes = useTranslations("RelationTypes");
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [isPhraseModalOpen, setIsPhraseModalOpen] = useState(false);

  const RelatedItemCard = ({
    item,
    onRemove
  }: {
    item: RelatedItem;
    onRemove: (id: number) => void;
  }) => (
    <Card className="w-full">
      <CardBody className="flex flex-row items-center justify-between p-3">
        <div className="flex flex-col">
          <span className="font-medium text-sm">{item.name}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {tRelationTypes(item.relationType as any)}
          </span>
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          color="danger"
          onPress={() => onRemove(item.id)}
          aria-label={t("removeItem")}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Accordion variant="bordered" defaultExpandedKeys={["related-words"]} selectionMode="multiple">
        {/* Related Words Section */}
        <AccordionItem
          key="related-words"
          aria-label={t("relatedWords")}
          title={
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-base font-medium">{t("relatedWords")}</span>
              <span className="text-sm text-gray-500">
                {relatedWords.length > 0 ? `(${relatedWords.length})` : ""}
              </span>
            </div>
          }
        >
          <div className="space-y-3 px-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("relatedWordsDescription")}
            </p>

            {relatedWords.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {relatedWords.map((word) => (
                  <RelatedItemCard
                    key={word.id}
                    item={word}
                    onRemove={onRemoveRelatedWord}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                {t("noRelatedWordsAdded")}
              </div>
            )}
            <Button
              className="w-full md:w-auto"
              color="primary"
              variant="flat"
              startContent={<Plus className="h-4 w-4" />}
              onPress={() => setIsWordModalOpen(true)}
            >
              {t("addRelatedWord")}
            </Button>
          </div>

        </AccordionItem>

        {/* Related Phrases Section */}
        <AccordionItem
          key="related-phrases"
          aria-label={t("relatedPhrases")}
          title={
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-base font-medium">{t("relatedPhrases")}</span>
              <span className="text-sm text-gray-500">
                {relatedPhrases.length > 0 ? `(${relatedPhrases.length})` : ""}
              </span>
            </div>
          }
        >
          <div className="space-y-3 px-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("relatedPhrasesDescription")}
            </p>

            {relatedPhrases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {relatedPhrases.map((phrase) => (
                  <RelatedItemCard
                    key={phrase.id}
                    item={phrase}
                    onRemove={onRemoveRelatedPhrase}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                {t("noRelatedPhrasesAdded")}
              </div>
            )}
            <Button
              color="primary"
              variant="flat"
              startContent={<Plus className="h-4 w-4" />}
              className="w-full md:w-auto"
              onPress={() => setIsPhraseModalOpen(true)}
            >
              {t("addRelatedPhrase")}
            </Button>
          </div>
        </AccordionItem>
      </Accordion>

      {/* Modals */}
      <AddRelatedItemModal
        isOpen={isWordModalOpen}
        onClose={() => setIsWordModalOpen(false)}
        onAddItem={onAddRelatedWord}
        itemType="word"
      />

      <AddRelatedItemModal
        isOpen={isPhraseModalOpen}
        onClose={() => setIsPhraseModalOpen(false)}
        onAddItem={onAddRelatedPhrase}
        itemType="phrase"
      />
    </div>
  );
}
