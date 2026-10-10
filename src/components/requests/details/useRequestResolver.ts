// src/components/requests/details/useRequestResolver.ts
import { useMemo } from "react";
import { api } from "@/src/trpc/react";
import { EntityTypes, Actions } from "@/db/schema/requests";
import { useTranslations } from "next-intl";

interface UseRequestResolverProps {
  entityType: EntityTypes;
  action: Actions;
  locale: "en" | "tr";
  newData?: any;
  oldData?: any;
}

const createMap = <T extends { id: number | string }>(arr: T[] | undefined, key: keyof T = 'id') => {
  return new Map(arr?.map(item => [item[key], item]));
};

export const resolveRequestData = (data: any, entity: EntityTypes, maps: any, locale: string, tRelationTypes: any) => {
  if (!data) return {};
  const beautifiedData = { ...data };

  const { wordAttrMap, meaningAttrMap, posMap, langMap, authorMap, wordNamesMap } = maps;

  switch (entity) {
    case 'words':
      if (beautifiedData.language) {
        const language = langMap.get(beautifiedData.language);
        beautifiedData.language = (locale === "en" ? language?.language_en : language?.language_tr) ?? beautifiedData.language;
      }
      if (Array.isArray(beautifiedData.attributes)) {
        beautifiedData.attributes = beautifiedData.attributes.map(
          (id: number | string) => wordAttrMap.get(Number(id))?.attribute || `ID: ${id}`
        );
      }
      if (beautifiedData.wordName) {
        beautifiedData.name = beautifiedData.wordName;
        delete beautifiedData.wordName;
      }
      if (beautifiedData.meanings && Array.isArray(beautifiedData.meanings)) {
        beautifiedData.meanings = beautifiedData.meanings.map((m: any) => resolveRequestData(m, 'meanings', maps, locale, tRelationTypes));
      }
      if (beautifiedData.relatedWords && Array.isArray(beautifiedData.relatedWords)) {
        beautifiedData.relatedWords = beautifiedData.relatedWords.map((m: any) => {
          if (m.relatedWordId) {
            return {
              relatedWord: wordNamesMap.get(m.relatedWordId)?.name || `ID: ${m.relatedWordId}`,
              ...m,
              relationType: typeof m.relationType === "string" && tRelationTypes.has(m.relationType) ? tRelationTypes(m.relationType) : m.relationType,
            }
          }
          return m;
        });
      }
      if (beautifiedData.relatedPhrases && Array.isArray(beautifiedData.relatedPhrases)) {
        beautifiedData.relatedPhrases = beautifiedData.relatedPhrases.map((m: any) => {
          if (m.relatedWordId) {
            return {
              relatedWord: wordNamesMap.get(m.relatedWordId)?.name || `ID: ${m.relatedWordId}`,
              ...m,
              relationType: typeof m.relationType === "string" && tRelationTypes.has(m.relationType) ? tRelationTypes(m.relationType) : m.relationType,
            }
          }
          return m;
        });
      }
      break;

    case 'meanings':
      if (beautifiedData.partOfSpeechId || beautifiedData.part_of_speech_id) {
        const id = beautifiedData.partOfSpeechId || beautifiedData.part_of_speech_id;
        beautifiedData.partOfSpeech = posMap.get(id)?.partOfSpeech || `ID: ${id}`;
        delete beautifiedData.partOfSpeechId;
        delete beautifiedData.part_of_speech_id;
      }

      if (beautifiedData.example && (beautifiedData.example.author || beautifiedData.example.author_id)) {
        beautifiedData.example = { ...beautifiedData.example };
        const authorId = beautifiedData.example.author || beautifiedData.example.author_id;
        beautifiedData.example.author = authorMap.get(authorId)?.name || `ID: ${authorId}`;
        delete beautifiedData.example.author_id;
      }
      // This handles cases where authorId is directly on the meaning, but we should prioritize the one in example.
      if (beautifiedData.authorId || beautifiedData.author_id) {
        beautifiedData.example = { ...beautifiedData.example };
        const authorId = beautifiedData.authorId || beautifiedData.author_id;
        beautifiedData.example.author = authorMap.get(authorId)?.name || `ID: ${authorId}`;
        delete beautifiedData.authorId;
        delete beautifiedData.author_id;
      }
      if (Array.isArray(beautifiedData.attributes)) {
        beautifiedData.attributes = beautifiedData.attributes.map(
          (id: number) => meaningAttrMap.get(id)?.attribute || `ID: ${id}`
        );
      }
      break;

    case 'related_words':
      if (beautifiedData.relatedWordId) {
        beautifiedData.relatedWord = wordNamesMap.get(beautifiedData.relatedWordId)?.name || `ID: ${beautifiedData.relatedWordId}`;
        delete beautifiedData.relatedWordId;
      }
      if (typeof beautifiedData.relationType === "string" && tRelationTypes.has(beautifiedData.relationType)) {
        beautifiedData.relationType = tRelationTypes(beautifiedData.relationType);
      }
      break;

    case 'related_phrases':
      if (beautifiedData.relatedPhraseId) {
        beautifiedData.relatedPhrase = wordNamesMap.get(beautifiedData.relatedPhraseId)?.name || `ID: ${beautifiedData.relatedPhraseId}`;
        delete beautifiedData.relatedPhraseId;
      }
      if (typeof beautifiedData.relationType === "string" && tRelationTypes.has(beautifiedData.relationType)) {
        beautifiedData.relationType = tRelationTypes(beautifiedData.relationType);
      }
      break;
  }

  return beautifiedData;
};

export const useRequestResolver = ({
  entityType,
  action,
  locale,
  newData,
  oldData,
}: UseRequestResolverProps) => {
  const { data: wordAttributes, isLoading: isLoadingWordAttributes } = api.request.getWordAttributesWithRequested.useQuery();
  const { data: meaningAttributes, isLoading: isLoadingMeaningAttributes } = api.request.getMeaningAttributesWithRequested.useQuery();
  const { data: languages, isLoading: isLoadingLanguages } = api.params.getLanguages.useQuery();
  const { data: partsOfSpeech, isLoading: isLoadingPartsOfSpeech } = api.params.getPartOfSpeeches.useQuery();
  const { data: authors, isLoading: isLoadingAuthors } = api.request.getAuthorsWithRequested.useQuery();
  const tRelationTypes = useTranslations("RelationTypes");

  const wordIdsToResolve = useMemo(() => {
    const ids = new Set<number>();
    if (entityType === 'related_words' || entityType === 'related_phrases' || entityType === 'words') {
      if (Array.isArray(newData?.relatedWords)) {
        newData.relatedWords.forEach((word: any) => ids.add(word.relatedWordId));
      }
      if (Array.isArray(oldData?.relatedWords)) {
        oldData.relatedWords.forEach((word: any) => ids.add(word.relatedWordId));
      }
      if (Array.isArray(newData?.relatedPhrases)) {
        newData.relatedPhrases.forEach((phrase: any) => ids.add(phrase.relatedWordId));
      }
      if (Array.isArray(oldData?.relatedPhrases)) {
        oldData.relatedPhrases.forEach((phrase: any) => ids.add(phrase.relatedWordId));
      }
      if (newData?.relatedWordId) {
        ids.add(newData.relatedWordId);
      }
      if (oldData?.relatedWordId) {
        ids.add(oldData.relatedWordId);
      }
      if (newData?.relatedPhraseId) {
        ids.add(newData.relatedPhraseId);
      }
      if (oldData?.relatedPhraseId) {
        ids.add(oldData.relatedPhraseId);
      }
    }
    return Array.from(ids).filter(id => Number.isInteger(id) && id > 0);
  }, [entityType, newData, oldData]);

  const { data: resolvedWords, isLoading: isLoadingResolvedWords } = api.word.getWordsByIds.useQuery(
    { ids: wordIdsToResolve },
    { enabled: wordIdsToResolve.length > 0 }
  );

  const isLoading =
    isLoadingWordAttributes ||
    isLoadingMeaningAttributes ||
    isLoadingLanguages ||
    isLoadingPartsOfSpeech ||
    isLoadingAuthors ||
    isLoadingResolvedWords;

  const maps = useMemo(() => ({
    wordAttrMap: createMap(wordAttributes, 'id'),
    meaningAttrMap: createMap(meaningAttributes, 'id'),
    posMap: createMap(partsOfSpeech, 'id'),
    langMap: createMap(languages, 'language_code'),
    authorMap: createMap(authors, 'id'),
    wordNamesMap: createMap(resolvedWords, 'id'),
  }), [wordAttributes, meaningAttributes, partsOfSpeech, languages, authors, resolvedWords]);

  const resolvedData = useMemo(() => {
    if (isLoading) {
      return { new: {}, old: {} };
    }

    const newResult = action === 'delete' ? {} : resolveRequestData(newData, entityType, maps, locale, tRelationTypes);
    const oldResult = action === 'create' ? {} : resolveRequestData(oldData, entityType, maps, locale, tRelationTypes);

    return {
      new: newResult,
      old: oldResult,
    };
  }, [isLoading, newData, oldData, entityType, action, maps, locale, tRelationTypes]);

  return { resolvedData, isLoading };
}
