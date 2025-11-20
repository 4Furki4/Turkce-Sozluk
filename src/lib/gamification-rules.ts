export const POINT_ECONOMY = {
    CREATE_WORD: 10,
    CREATE_MEANING: 5,
    CREATE_PRONUNCIATION: 5,
    CREATE_MEANING_ATTRIBUTE: 2,
    CREATE_RELATED_WORD: 2,
    // Add other actions as needed
} as const;

export type PointAction = keyof typeof POINT_ECONOMY;
