"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Loader2 } from "lucide-react";
import { useDebounce } from "@/src/hooks/use-debounce";

// --- 1. REMOVE tRPC IMPORT ---
// import { api } from "@/src/trpc/react";

// --- 2. ADD OFFLINE DB IMPORT ---
import { searchAutocompleteOffline } from "@/src/lib/offline-db";

export function WordRecommendation({
    onWordSelect,
    placeholder,
    className,
}: {
    onWordSelect: (word: string) => void;
    placeholder: string;
    className?: string;
}) {
    const [query, setQuery] = useState("");

    // --- 3. UPDATE STATE AND DATA FETCHING ---
    const [suggestions, setSuggestions] = useState<string[]>([]); // Changed to string[]
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const debouncedQuery = useDebounce(query, 300);

    // This replaces your tRPC hook
    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        const fetchSuggestions = async () => {
            setIsLoading(true);
            // Call our new super-fast offline function
            const results = await searchAutocompleteOffline(debouncedQuery);
            setSuggestions(results);
            setIsOpen(results.length > 0);
            setIsLoading(false);
        };

        fetchSuggestions();
    }, [debouncedQuery]);
    // --- END OF UPDATED LOGIC ---

    const [activeIndex, setActiveIndex] = useState(-1);
    const router = useRouter();
    const locale = useLocale();
    const searchResultsRef = useRef<HTMLUListElement>(null);

    const handleSelect = (selectedQuery: string) => {
        const word = selectedQuery.trim();
        if (!word) return;

        setQuery(word);
        setIsOpen(false);
        setSuggestions([]);
        onWordSelect(word);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // This keyboard logic is from the original component
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
            searchResultsRef.current?.children[activeIndex + 1]?.scrollIntoView(false);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
            searchResultsRef.current?.children[activeIndex - 1]?.scrollIntoView(false);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex !== -1) {
                handleSelect(suggestions[activeIndex]);
            } else {
                handleSelect(query);
            }
        } else if (e.key === "Escape") {
            handleClose();
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        if (e.target.value.length > 1) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    return (
        <div className="relative w-full">
            <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={handleClose}
                placeholder={placeholder}
                className={className}
                autoComplete="off"
            />
            {isLoading && (
                <Loader2 className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            )}

            {isOpen && suggestions.length > 0 && (
                <ul
                    ref={searchResultsRef}
                    className="absolute z-10 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md mt-1 border border-gray-200 dark:border-gray-700"
                >
                    {suggestions.map((item, index) => (
                        <li
                            key={item} // --- 4. UPDATED KEY ---
                            className={`p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm ${index === activeIndex ? "bg-gray-100 dark:bg-gray-700" : ""
                                }`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(item); // --- 5. UPDATED TO USE ITEM DIRECTLY ---
                            }}
                        >
                            {item} {/* --- 6. UPDATED TO USE ITEM DIRECTLY --- */}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}