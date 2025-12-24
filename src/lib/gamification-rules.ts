export const POINT_ECONOMY = {
    // Create actions
    CREATE_WORD: 10,
    CREATE_MEANING: 5,
    CREATE_PRONUNCIATION: 5,
    CREATE_MEANING_ATTRIBUTE: 2,
    CREATE_WORD_ATTRIBUTE: 2,
    CREATE_RELATED_WORD: 2,
    CREATE_RELATED_PHRASE: 2,
    CREATE_EXAMPLE: 3,
    CREATE_AUTHOR: 2,
    CREATE_GALATIMESHUR: 3,
    CREATE_MISSPELLING: 2,

    // Update actions
    UPDATE_WORD: 5,
    UPDATE_MEANING: 3,
    UPDATE_RELATED_PHRASE: 2,
    UPDATE_RELATED_WORD: 2,
    UPDATE_EXAMPLE: 2,
    UPDATE_GALATIMESHUR: 2,

    // Delete actions (smaller rewards for cleanup work)
    DELETE_MEANING: 1,
    DELETE_RELATED_WORD: 1,
    DELETE_RELATED_PHRASE: 1,
    DELETE_EXAMPLE: 1,
} as const;

export type PointAction = keyof typeof POINT_ECONOMY;

// Helper to get points for a given action and entity type
export function getPointsForRequest(action: string, entityType: string): number {
    const key = `${action.toUpperCase()}_${entityType.toUpperCase().replace('_', '')}` as keyof typeof POINT_ECONOMY;

    // Direct mapping lookup
    const actionEntityMap: Record<string, Record<string, number>> = {
        create: {
            words: POINT_ECONOMY.CREATE_WORD,
            meanings: POINT_ECONOMY.CREATE_MEANING,
            pronunciations: POINT_ECONOMY.CREATE_PRONUNCIATION,
            meaning_attributes: POINT_ECONOMY.CREATE_MEANING_ATTRIBUTE,
            word_attributes: POINT_ECONOMY.CREATE_WORD_ATTRIBUTE,
            related_words: POINT_ECONOMY.CREATE_RELATED_WORD,
            related_phrases: POINT_ECONOMY.CREATE_RELATED_PHRASE,
            examples: POINT_ECONOMY.CREATE_EXAMPLE,
            authors: POINT_ECONOMY.CREATE_AUTHOR,
            galatimeshur: POINT_ECONOMY.CREATE_GALATIMESHUR,
            misspellings: POINT_ECONOMY.CREATE_MISSPELLING,
        },
        update: {
            words: POINT_ECONOMY.UPDATE_WORD,
            meanings: POINT_ECONOMY.UPDATE_MEANING,
            related_phrases: POINT_ECONOMY.UPDATE_RELATED_PHRASE,
            related_words: POINT_ECONOMY.UPDATE_RELATED_WORD,
            examples: POINT_ECONOMY.UPDATE_EXAMPLE,
            galatimeshur: POINT_ECONOMY.UPDATE_GALATIMESHUR,
        },
        delete: {
            meanings: POINT_ECONOMY.DELETE_MEANING,
            related_words: POINT_ECONOMY.DELETE_RELATED_WORD,
            related_phrases: POINT_ECONOMY.DELETE_RELATED_PHRASE,
            examples: POINT_ECONOMY.DELETE_EXAMPLE,
        },
    };

    return actionEntityMap[action]?.[entityType] ?? 0;
}
