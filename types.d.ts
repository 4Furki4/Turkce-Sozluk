import { InsertWord } from "./db/schema/words";

type LoginInputs = {
  usernameOrEmail: string;
  password: string;
};

type ForgotPassword = {
  forgotPasswordEmail: string;
};
type Prettify<T> = { [K in keyof T]: T[K] } & {};
type SignupInputs =
  | "name"
  | "username"
  | "email"
  | "password"
  | "confirmPassword";
type SignupForm = Record<SignupInputs, string>;

type SignupRequest = Omit<SignupForm, "confirmPassword">; // Omit confirmPassword from SignUpInputs to create SignUpRequest
type ReplaceNullWithUndefined<T> = T extends null ? undefined : T;
type ToUndefinedProps<T> = {
  // Replace null with undefined
  [P in keyof T]: ReplaceNullWithUndefined<T[P]>;
};

type WordInput = ToUndefinedProps<
  // Replace null with undefined since null is not allowed in Input value prop of NextUI
  Prettify<
    Partial<
      Omit<InsertWord, "rootId" | "created_at" | "updated_at" | "id"> &
      {
        language: string
        root: string;
        attributes: string[];
      }
    >
  >
>;

type Meaning = {
  meaning: string;
  image: FileList | null;
  example?: {
    sentence: string | undefined;
    author?: string | undefined;
  };
  partOfSpeechId?: number | undefined;
  attributes: string[];
};

type MeaningInputs = Partial<Meaning>;

type WordForm = Prettify<
  WordInput & {
    meanings: MeaningInputs[];
  }
>;

type WordFormSubmit = Prettify<{
  name: string;
  language?: string;
  phonetic?: string;
  root?: string;
  prefix?: string;
  suffix?: string;
  attributes: number[]
  meanings: {
    meaning: string;
    partOfSpeechId?: number;
    attributes: number[];
    example?: {
      sentence: string;
      author?: number | undefined;
    }
  }[]
}>;
type Language = {
  id: number;
  language_en: string | null;
  language_tr: string;
  language_code: string;
}
type WordSearchResult = {
  word_data: {
    word_id: number;
    word_name: string;
    phonetic: string;
    prefix: string;
    suffix: string;
    attributes?: {
      attribute_id: number;
      attribute: string;
    }[];
    root: {
      root: string;
    } & Omit<Language, "id">
    meanings: {
      meaning_id: number;
      meaning: string;
      imageUrl: string | null;
      part_of_speech?: string;
      part_of_speech_id?: number
      sentence: string | undefined;
      author: string | undefined;
      author_id: number | undefined
      attributes?: [
        {
          attribute_id: number;
          attribute: string;
        }
      ]
    }[];
    relatedWords?: { related_word_id: number; related_word_name: string; relation_type?: string }[];
    relatedPhrases?: { related_phrase_id: number; related_phrase: string }[];
  }
}
type SavedWordsResult = {
  word_data: {
    word_id: number;
    word_name: string;
    saved_at: string;
    attributes?: {
      attribute_id: number;
      attribute: string;
    }[];
    root: {
      root: string;
      language: string;
    };
    meaning: string;
  }
}
type DashboardWordList = {
  word_id: number;
  name: string;
  meaning: string | null;
  related_word_name: string | null;
  relation_type: string | null;
}

type EditMeaningForm = {
  id: string | number
  meaning: string
  attributes?: string[]
  partOfSpeechId?: string
  exampleSentence: string | undefined
  authorId: string | undefined
}

type EditWordForm = {
  name: string
  attributes?: string[]
  language?: string
  root?: string
  phonetic?: string
  suffix?: string
  prefix?: string
  meanings: EditMeaningForm[]
}


type NewAttributeForm = {
  attribute: string
};

type NewAuthorForm = {
  name: string;
};
