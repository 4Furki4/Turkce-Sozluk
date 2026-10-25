export type MeaningEditRequestForm = {
  meaning_id: number;
  meaning: string;
  partOfSpeechId?: string | null;
  attributes?: string[];
  sentence?: string;
  authorId?: string;
  reason: string;
};
