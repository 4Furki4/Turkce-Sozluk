"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import { Card, Button, CardBody, CardHeader, Divider, Spinner, Tab } from "@heroui/react";
import { CustomTabs } from "@/src/components/customs/heroui/custom-tabs";
import { useProgressRouter } from "@/src/hooks/use-progress-router";
import WordRelationSuggestions from "./word-relation-suggestions";
import RelatedPhrasesList from "./related-phrases-list";
import AddRelatedPhraseForm from "./add-related-phrase-form";
import WordSearch from "./word-search";
import AddRelatedWordForm from "./add-related-word-form";
import RelatedWordsList from "./related-words-list";
import WordRelationsGraph from "@/src/components/word-graph/word-relations-graph";

export default function WordRelationsManager() {
  return <Suspense fallback={<Spinner />}><WordRelationTabs /></Suspense>;
}

function WordRelationTabs() {
  const t = useTranslations("Dashboard.WordRelations.Suggestions");
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useProgressRouter();
  return <CustomTabs aria-label={t("tabsLabel")} selectedKey={params.get("view") === "manual" ? "manual" : "suggestions"} onSelectionChange={(key) => {
    const next = new URLSearchParams(params.toString());
    next.set("view", String(key));
    router.push(`${pathname}?${next}`, { scroll: false });
  }}>
    <Tab key="suggestions" title={t("tab")}><WordRelationSuggestions /></Tab>
    <Tab key="manual" title={t("manualTab")}><ManualWordRelationsManager /></Tab>
  </CustomTabs>;
}

function ManualWordRelationsManager() {
  const t = useTranslations("Dashboard.WordRelations");
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useProgressRouter();
  const utils = api.useUtils();
  const rawId = Number(params.get("wordId"));
  const selectedWordId = Number.isInteger(rawId) && rawId > 0 ? rawId : null;

  // Get the selected word details
  const { data: wordDetails } = api.admin.wordRelations.getWordById.useQuery(
    { id: selectedWordId! },
    {
      enabled: !!selectedWordId,
    }
  );

  const selectedWordName = wordDetails?.name ?? "";

  // Handle word selection
  const handleWordSelect = (id: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("wordId", String(id));
    router.push(`${pathname}?${next}`, { scroll: false });
  };

  // Reset selection
  const handleReset = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("wordId");
    router.push(`${pathname}?${next}`, { scroll: false });
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

  const refreshWordRelations = () => {
    void Promise.all([relatedWordsQuery.refetch(), utils.admin.wordRelations.getSuggestions.invalidate(), utils.wordGraph.invalidate()]);
  };

  return (
    <div className="space-y-8">
      {/* Word search section */}
      <Card className="bg-background/40">
        <CardHeader>
          <h2 className="text-xl font-semibold">{t("searchWord")}</h2>
        </CardHeader>
        <CardBody>
          <WordSearch onWordSelect={handleWordSelect} />
        </CardBody>
      </Card>

      {/* Selected word and related words section */}
      {selectedWordId && (
        <Card className="bg-background/40">
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
              <Card className="bg-background/40">
                <CardBody className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Add related word form */}
                  <div>
                    <h4 className="text-lg font-medium mb-4">{t("addRelatedWord")}</h4>
                    <AddRelatedWordForm
                      wordId={selectedWordId}
                      onSuccess={refreshWordRelations}
                    />
                  </div>

                  {/* Related words list */}
                  <div>
                    <h4 className="text-lg font-medium mb-4">{t("relatedWords")}</h4>
                    <RelatedWordsList
                      wordId={selectedWordId}
                      relatedWords={relatedWordsQuery.data || []}
                      isLoading={relatedWordsQuery.isLoading}
                      onRelationRemoved={refreshWordRelations}
                      onRelationUpdated={refreshWordRelations}
                    />
                  </div>
                </CardBody>
              </Card>
            </div>

            <Divider className="my-6" />

            {/* Phrase Relations Section */}
            <div>
              <h3 className="text-xl font-semibold mb-4">{t("relatedPhrases")}</h3>
              <Card className="bg-background/40">
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
