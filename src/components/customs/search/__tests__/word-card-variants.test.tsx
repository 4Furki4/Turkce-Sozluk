import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SearchWordCardVariantGroup } from "../word-card-variants";
import {
  SEARCH_WORD_CARD_VARIANT_STORAGE_KEY,
  initializePreferences,
  preferencesState,
} from "@/src/store/preferences";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: (namespace?: string) => {
    const dictionaries: Record<string, Record<string, string>> = {
      WordCard: {
        Layout: "Layout",
        ReadingLayout: "Reading",
        MagazineLayout: "Compact",
        Words: "Words",
        Definitions: "Definitions",
        Connections: "Connections",
        MoreDefinitions: "More Definitions",
        Pronunciations: "Pronunciations",
        RelatedWords: "Related Words",
        RelatedPhrases: "Related Phrases",
        Root: "Root",
        views: "views",
        RequestEdit: "Request Edit",
        SignIn: "Sign in",
        "You can request an edit if you are signed in": "You can request an edit if you are signed in",
        NoMeaningsFound: "No meanings found",
        NavigationWord: "Navigation Word",
        Screenshot: "Screenshot",
        Share: "Share",
        PlayPronunciation: "Play pronunciation",
        NoPronunciationsPrompt: "No pronunciations yet.",
        AddPronunciationPrompt: "Request an edit to add one.",
        RequestPronunciation: "Request pronunciation",
        ViewCountUpdatedAt: "View count updated {date}",
        ViewCountUpdatedUnknown: "View count update time is not available.",
        screenshotProcessing: "Creating screenshot...",
        screenshotCopied: "Screenshot copied",
        screenshotFailed: "Screenshot failed",
        screenshotDownloadFallback: "Downloading screenshot instead.",
        urlCopiedDescription: "URL copied",
      },
      Pronunciations: {
        loading: "Loading pronunciations...",
        noPronunciations: "No pronunciations available yet.",
      },
    };

    return (key: string, values?: Record<string, string | number>) => {
      let message = dictionaries[namespace ?? ""]?.[key] ?? key;

      if (values) {
        Object.entries(values).forEach(([name, value]) => {
          message = message.replace(`{${name}}`, String(value));
        });
      }

      return message;
    };
  },
}));

jest.mock("@heroui/react", () => {
  const React = require("react");

  return {
    Button: ({
      children,
      onPress,
      onClick,
      isIconOnly,
      isDisabled,
      disableRipple,
      color,
      variant,
      size,
      ...props
    }: any) => (
      <button type="button" disabled={isDisabled} onClick={onPress ?? onClick} {...props}>
        {children}
      </button>
    ),
    Avatar: ({ name, src, ...props }: any) => <img alt={name} src={src} {...props} />,
    Chip: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    useDisclosure: () => ({
      isOpen: false,
      onOpen: jest.fn(),
      onOpenChange: jest.fn(),
      onClose: jest.fn(),
    }),
  };
});

jest.mock("framer-motion", () => {
  const React = require("react");

  const passthrough = React.forwardRef(({
    children,
    layoutId,
    initial,
    animate,
    exit,
    transition,
    whileHover,
    ...props
  }: any, ref: React.Ref<HTMLElement>) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));

  return {
    AnimatePresence: ({ children }: any) => <>{children}</>,
    LayoutGroup: ({ children }: any) => <>{children}</>,
    motion: {
      div: passthrough,
      li: passthrough,
      span: passthrough,
    },
    useReducedMotion: () => true,
  };
});

jest.mock("@/src/i18n/routing", () => ({
  Link: ({ children, href, prefetch, ...props }: any) => <a href={typeof href === "string" ? href : "#"} {...props}>{children}</a>,
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("@/src/components/customs/heroui/custom-card", () => {
  const React = require("react");

  return React.forwardRef(({ as: Component = "div", children, ...props }: any, ref: React.Ref<HTMLElement>) => (
    <Component ref={ref} {...props}>
      {children}
    </Component>
  ));
});

jest.mock("@/src/components/customs/save-word", () => () => <button type="button">Save</button>);
jest.mock("@/src/components/customs/pronunciation-card", () => ({
  PronunciationCard: () => <div>Pronunciations</div>,
}));
jest.mock("@/src/components/customs/custom-audio", () => ({
  CustomAudioPlayer: ({ src }: { src: string }) => <audio src={src} />,
}));
jest.mock("@/src/components/customs/modals/word-card-request-modal", () => ({
  __esModule: true,
  default: ({ initialView }: { initialView: string }) => (
    <div data-testid="request-modal-initial-view">{initialView}</div>
  ),
}));
jest.mock("@/src/components/customs/word-not-found-card", () => () => <div>Not Found</div>);
jest.mock("@/src/utils/clipboard", () => ({
  copyPageUrl: jest.fn(),
}));
jest.mock("@/src/utils/screenshot", () => ({
  captureElementScreenshot: jest.fn(),
}));
jest.mock("@/src/lib/navigation-progress", () => ({
  startNavigationProgress: jest.fn(),
}));
jest.mock("@/src/trpc/react", () => ({
  api: {
    word: {
      getPronunciationsForWord: {
        useQuery: () => ({
          data: [],
          isLoading: false,
        }),
      },
    },
  },
}));

const sampleWord = {
  word_data: {
    word_id: 1,
    word_name: "kitap",
    phonetic: "kitap",
    prefix: "",
    suffix: "",
    view_count: 1200,
    updated_at: "2026-04-25T10:00:00.000Z",
    attributes: [{ attribute_id: 1, attribute: "isim" }],
    root: {
      id: 1,
      root: "kitap",
      language_en: "Arabic",
      language_tr: "Arapça",
    },
    meanings: [
      {
        meaning_id: 11,
        meaning: "Bound pages gathered into a volume.",
        imageUrl: null,
        part_of_speech: "noun",
        sentence: "I opened the book.",
        author: "Author",
        author_id: 1,
        attributes: [{ attribute_id: 2, attribute: "common" }],
      },
    ],
    relatedWords: [{ related_word_id: 2, related_word_name: "defter", relation_type: "seeAlso" }],
    relatedPhrases: [{ related_phrase_id: 3, related_phrase: "kitap gibi" }],
  },
};

describe("SearchWordCardVariantGroup", () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = jest.fn();
    preferencesState.isBlurEnabled = true;
    preferencesState.searchWordCardVariant = "reader";
    preferencesState.isInitialized = false;
  });

  it("defaults to the reading layout", () => {
    initializePreferences();

    render(
      <SearchWordCardVariantGroup
        data={[sampleWord]}
        locale="en"
        session={null}
        headingLevel="h1"
      />,
    );

    expect(screen.getByRole("radio", { name: "Reading" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Compact" })).toHaveAttribute("aria-checked", "false");
  });

  it("updates the selected layout and persists the choice", async () => {
    initializePreferences();

    render(
      <SearchWordCardVariantGroup
        data={[sampleWord]}
        locale="en"
        session={null}
        headingLevel="h1"
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("radio", { name: "Compact" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Compact" })).toHaveAttribute("aria-checked", "true");
    });
    expect(localStorage.getItem(SEARCH_WORD_CARD_VARIANT_STORAGE_KEY)).toBe("magazine");
  });

  it("rehydrates the stored layout and maps legacy dossier values to magazine", () => {
    localStorage.setItem(SEARCH_WORD_CARD_VARIANT_STORAGE_KEY, "dossier");
    initializePreferences();

    render(
      <SearchWordCardVariantGroup
        data={[sampleWord]}
        locale="en"
        session={null}
        headingLevel="h1"
      />,
    );

    expect(screen.getByRole("radio", { name: "Compact" })).toHaveAttribute("aria-checked", "true");
    expect(preferencesState.searchWordCardVariant).toBe("magazine");
  });

  it("keeps pronunciation and view freshness affordances visible in compact layout", () => {
    localStorage.setItem(SEARCH_WORD_CARD_VARIANT_STORAGE_KEY, "magazine");
    initializePreferences();

    render(
      <SearchWordCardVariantGroup
        data={[sampleWord]}
        locale="en"
        session={null}
        headingLevel="h1"
      />,
    );

    expect(screen.getAllByRole("button", { name: "Request pronunciation" }).length).toBeGreaterThan(0);
    expect(screen.getByText("No pronunciations yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /View count updated/ })).toBeInTheDocument();
  });

  it("scrolls to and highlights a compact meaning from a tag", () => {
    localStorage.setItem(SEARCH_WORD_CARD_VARIANT_STORAGE_KEY, "magazine");
    initializePreferences();

    render(
      <SearchWordCardVariantGroup
        data={[sampleWord]}
        locale="en"
        session={null}
        headingLevel="h1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "noun" }));

    const meaning = document.getElementById("word-1-meaning-11");
    expect(meaning).toHaveClass("bg-primary/10");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  it("opens the request modal on the pronunciation request view from compact CTA", () => {
    localStorage.setItem(SEARCH_WORD_CARD_VARIANT_STORAGE_KEY, "magazine");
    initializePreferences();

    render(
      <SearchWordCardVariantGroup
        data={[sampleWord]}
        locale="en"
        session={{ user: { id: "user-1" } } as any}
        headingLevel="h1"
      />,
    );

    expect(screen.getByTestId("request-modal-initial-view")).toHaveTextContent("word");

    const requestPronunciationButtons = screen.getAllByRole("button", { name: "Request pronunciation" });
    fireEvent.click(requestPronunciationButtons[requestPronunciationButtons.length - 1]);

    expect(screen.getByTestId("request-modal-initial-view")).toHaveTextContent("pronunciation");
  });
});
