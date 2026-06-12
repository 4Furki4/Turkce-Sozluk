"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import { Card, Button, CardBody, CardHeader, Divider } from "@heroui/react";
import RelatedPhrasesList from "./related-phrases-list";
import AddRelatedPhraseForm from "./add-related-phrase-form";
import WordSearch from "./word-search";
import AddRelatedWordForm from "./add-related-word-form";
import RelatedWordsList from "./related-words-list";
import WordRelationsGraph from "@/src/components/word-graph/word-relations-graph";

export default function WordRelationsManager() {
  const t = useTranslations("Dashboard.WordRelations");
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [selectedWordName, setSelectedWordName] = useState<string>("");

  // Get the selected word details
  const { data: wordDetails } = api.admin.wordRelations.getWordById.useQuery(
    { id: selectedWordId! },
    {
      enabled: !!selectedWordId,
    }
  );

  // Update selected word name when details change
  if (wordDetails?.name && wordDetails.name !== selectedWordName) {
    setSelectedWordName(wordDetails.name);
  }

  // Handle word selection
  const handleWordSelect = (id: number, name: string) => {
    setSelectedWordId(id);
    setSelectedWordName(name);
  };

  // Reset selection
  const handleReset = () => {
    setSelectedWordId(null);
    setSelectedWordName("");
  };

  // Get related words for the selected word
  const relatedWordsQuery = api.admin.wordRelations.getRelatedWords.useQuery(
    { wordId: selectedWordId! },
    { enabled: !!selectedWordId }
  );

  // Get related phrases for the selected word
  const relatedPhrasesQuery = api.admin.wordRelations.getRelatedPhrases.useQuery(
    { wordId: selectedWordId! },
    { enabled: !!selectedWordId }
  );

  return (
    <div className="space-y-8">
      {/* Word search section */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{t("searchWord")}</h2>
        </CardHeader>
        <CardBody>
          <WordSearch onWordSelect={handleWordSelect} />
        </CardBody>
      </Card>

      {/* Selected word and related words section */}
      {selectedWordId && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center w-full">
              <div>
                <h2 className="text-xl font-semibold">{t("selectedWord")}: {selectedWordName}</h2>
                <p>{t("wordId")}: {selectedWordId}</p>
              </div>
              <Button
                onPress={handleReset}
                variant="light"
              >
                {t("selectDifferentWord")}
              </Button>
            </div>
          </CardHeader>
          <Divider />

          <CardBody>
            <div className="mb-8">
              <WordRelationsGraph
                key={`${selectedWordId}-${relatedWordsQuery.data?.length ?? 0}-${relatedPhrasesQuery.data?.length ?? 0}`}
                wordId={selectedWordId}
                word={selectedWordName}
              />
            </div>

            {/* Word Relations Section */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">{t("relatedWords")}</h3>
              <Card>
                <CardBody className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Add related word form */}
                  <div>
                    <h4 className="text-lg font-medium mb-4">{t("addRelatedWord")}</h4>
                    <AddRelatedWordForm
                      wordId={selectedWordId}
                      onSuccess={() => relatedWordsQuery.refetch()}
                    />
                  </div>

                  {/* Related words list */}
                  <div>
                    <h4 className="text-lg font-medium mb-4">{t("relatedWords")}</h4>
                    <RelatedWordsList
                      wordId={selectedWordId}
                      relatedWords={relatedWordsQuery.data || []}
                      isLoading={relatedWordsQuery.isLoading}
                      onRelationRemoved={() => relatedWordsQuery.refetch()}
                      onRelationUpdated={() => relatedWordsQuery.refetch()} // Added this line
                    />
                  </div>
                </CardBody>
              </Card>
            </div>

            <Divider className="my-6" />

            {/* Phrase Relations Section */}
            <div>
              <h3 className="text-xl font-semibold mb-4">{t("relatedPhrases")}</h3>
              <Card>
                <CardBody className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Add related phrase form */}
                  <div>
                    <h4 className="text-lg font-medium mb-4">{t("addRelatedPhrase")}</h4>
                    <AddRelatedPhraseForm
                      wordId={selectedWordId}
                      onSuccess={() => relatedPhrasesQuery.refetch()}
                    />
                  </div>

                  {/* Related phrases list */}
                  <div>
                    <h4 className="text-lg font-medium mb-4">{t("relatedPhrases")}</h4>
                    <RelatedPhrasesList
                      wordId={selectedWordId}
                      onRelationRemoved={() => relatedPhrasesQuery.refetch()}
                    />
                  </div>
                </CardBody>
              </Card>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
