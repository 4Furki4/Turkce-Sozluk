
// src/components/requests/details/registry.tsx
import { EntityTypes, Actions } from "@/db/schema/requests";
import { FC } from "react";
import { UpdateWordAttribute } from "./word-attribute/update";
import { CreateWordAttribute } from "./word-attribute/create";
import { UpdateWord } from "./word/update";
import { CreateWord } from "./word/create";
import { UpdateMeaning } from "./meaning/update";
import { DeleteMeaning } from "./meaning/delete";
import { UpdateRelatedWord } from "./related-word/update";
import { DeleteRelatedWord } from "./related-word/delete";
import { CreateRelatedWord } from "./related-word/create";
import { DeleteRelatedPhrase } from "./related-phrase/delete";
import { CreateRelatedPhrase } from "./related-phrase/create";
import { CreateMeaningAttribute } from "./meaning-attribute/create";
import { CreateAuthor } from "./author/create";
import CreatePronunciation from "./pronunciation/create";

export type RequestDetailComponentProps = {
  newData?: any;
  oldData?: any;
  entityId?: number;
};

type ComponentRegistry = {
  [key in EntityTypes]?: {
    [key in Actions]?: FC<RequestDetailComponentProps>;
  };
};

const registry: ComponentRegistry = {
  word_attributes: {
    create: CreateWordAttribute,
    update: UpdateWordAttribute,
  },
  words: {
    create: CreateWord,
    update: UpdateWord,
  },
  meanings: {
    update: UpdateMeaning,
    delete: DeleteMeaning,
  },
  related_words: {
    create: CreateRelatedWord,
    update: UpdateRelatedWord,
    delete: DeleteRelatedWord,
  },
  related_phrases: {
    create: CreateRelatedPhrase,
    delete: DeleteRelatedPhrase,
  },
  meaning_attributes: {
    create: CreateMeaningAttribute,
  },
  authors: {
    create: CreateAuthor,
  },
  pronunciations: {
    create: CreatePronunciation,
  },
};

export function getRequestDetailComponent(
  entityType: EntityTypes,
  action: Actions
): FC<RequestDetailComponentProps> | undefined {
  return registry[entityType]?.[action];
}
