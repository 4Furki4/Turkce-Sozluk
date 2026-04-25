// src/store/preferences.ts
import { proxy, subscribe } from 'valtio';

export type SearchWordCardVariant = "reader" | "magazine";

export const SEARCH_WORD_CARD_VARIANT_STORAGE_KEY = "searchWordCardVariant";

// 1. Define the type for our state
type PreferencesState = {
    isBlurEnabled: boolean;
    isInitialized: boolean; // To prevent writing to localStorage on server/initial render
    searchWordCardVariant: SearchWordCardVariant;
};

// 2. Create the proxy state object
export const preferencesState = proxy<PreferencesState>({
    isBlurEnabled: true,
    isInitialized: false,
    searchWordCardVariant: "reader",
});

const normalizeSearchWordCardVariant = (value: string | null): SearchWordCardVariant | null => {
    if (value === "reader" || value === "magazine") {
        return value;
    }

    if (value === "dossier") {
        return "magazine";
    }

    return null;
};

// 3. Define actions to mutate the state
export const initializePreferences = () => {
    if (typeof window !== 'undefined') {
        try {
            const storedPreference = localStorage.getItem('isBlurEnabled');
            if (storedPreference !== null) {
                preferencesState.isBlurEnabled = JSON.parse(storedPreference);
            }
        } catch (error) {
            console.error('Failed to parse blur preference from localStorage', error);
        }

        const storedCardVariant = normalizeSearchWordCardVariant(
            localStorage.getItem(SEARCH_WORD_CARD_VARIANT_STORAGE_KEY)
        );
        if (storedCardVariant) {
            preferencesState.searchWordCardVariant = storedCardVariant;
        }

        preferencesState.isInitialized = true;
    }
};

export const toggleBlur = () => {
    preferencesState.isBlurEnabled = !preferencesState.isBlurEnabled;
};

export const setSearchWordCardVariant = (variant: SearchWordCardVariant) => {
    preferencesState.searchWordCardVariant = variant;
};

// 4. Subscribe to changes and persist to localStorage
subscribe(preferencesState, () => {
    // Only save to localStorage if the state has been initialized on the client
    if (preferencesState.isInitialized && typeof window !== 'undefined') {
        localStorage.setItem('isBlurEnabled', JSON.stringify(preferencesState.isBlurEnabled));
        localStorage.setItem(
            SEARCH_WORD_CARD_VARIANT_STORAGE_KEY,
            preferencesState.searchWordCardVariant
        );
    }
});
