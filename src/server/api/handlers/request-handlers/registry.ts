// src/server/api/handlers/request-handlers/registry.ts
import { EntityTypes, Actions } from "@/db/schema/requests";
import { RequestHandler } from "./types";
import { CreateWordAttributeHandler, UpdateWordAttributeHandler } from "./word-attribute-handlers";
import { CreateWordHandler, UpdateWordHandler } from "./word-handler";
import { UpdateMeaningHandler, DeleteMeaningHandler } from "./meaning-handler";
import { CreateRelatedWordHandler, UpdateRelatedWordHandler, DeleteRelatedWordHandler } from "./related-words-handler";
import { CreateRelatedPhraseHandler, UpdateRelatedPhraseHandler, DeleteRelatedPhraseHandler } from "./related-phrase-handler";
import { CreateMeaningAttributeHandler } from "./meaning-attribute-handlers";
import { CreateAuthorHandler } from "./author-handlers";
import { CreatePronunciationHandler } from "./pronunciation-handler";
// Import other handlers

type HandlerRegistry = {
    [key in EntityTypes]?: {
        [key in Actions]?: RequestHandler<any>
    };
};

const registry: HandlerRegistry = {
    word_attributes: {
        create: new CreateWordAttributeHandler(),
        update: new UpdateWordAttributeHandler(),
    },
    words: {
        create: new CreateWordHandler(),
        update: new UpdateWordHandler(),
    },
    meanings: {
        update: new UpdateMeaningHandler(),
        delete: new DeleteMeaningHandler(),
    },
    related_words: {
        create: new CreateRelatedWordHandler(),
        update: new UpdateRelatedWordHandler(),
        delete: new DeleteRelatedWordHandler(),
    },
    related_phrases: {
        create: new CreateRelatedPhraseHandler(),
        update: new UpdateRelatedPhraseHandler(),
        delete: new DeleteRelatedPhraseHandler(),
    },
    meaning_attributes: {
        create: new CreateMeaningAttributeHandler(),
    },
    authors: {
        create: new CreateAuthorHandler(),
    },
    pronunciations: {
        create: new CreatePronunciationHandler(),
    },
    // Add other entity types and actions...
};

export function getHandler(entityType: EntityTypes, action: Actions): RequestHandler<any> | undefined {
    return registry[entityType]?.[action];
}