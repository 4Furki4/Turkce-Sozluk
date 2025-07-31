import { z } from "zod";

// Base schemas for common entities
export const MeaningSchema = z.object({
  partOfSpeechId: z.number().nullable().optional(),
  meaning: z.string(),
  attributes: z.array(z.number()).nullable().optional(),
  example: z.object({
    sentence: z.string().nullable().optional(),
    author: z.number().nullable().optional(),
  }).nullable().optional(),
  imageUrl: z.string().nullable().optional(), // This will be a URL after upload
});

export const RelatedWordSchema = z.object({
  relatedWordId: z.number(),
  relationType: z.string(),
});

export const RelatedPhraseSchema = z.object({
  relatedWordId: z.number(), // This is actually relatedPhraseId in the form
  relationType: z.string().nullable().optional(), // Not strictly needed for phrases but kept for consistency if needed
});

// Schemas for different request types

// Create Word Request (from DetailedContributionForm)
export const CreateWordRequestSchema = z.object({
  name: z.string(),
  phonetic: z.string().nullable().optional(),
  prefix: z.string().nullable().optional(),
  root: z.string().nullable().optional(),
  suffix: z.string().nullable().optional(),
  language: z.string().nullable().optional(), // languageCode from form
  attributes: z.array(z.number()).nullable().optional(), // These are parsed to numbers before sending
  meanings: z.array(MeaningSchema).nullable().optional(),
  relatedWords: z.array(RelatedWordSchema).nullable().optional(),
  relatedPhrases: z.array(RelatedPhraseSchema).nullable().optional(),
  captchaToken: z.string(),
});


// Update Word Request (from WordEditRequest)
export const UpdateWordRequestSchema = z.object({
  reason: z.string(),
  phonetic: z.string().nullable().optional(),
  prefix: z.string().nullable().optional(),
  suffix: z.string().nullable().optional(),
  root: z.string().nullable().optional(),
  wordName: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  attributes: z.array(z.string()).nullable().optional(), // These are string IDs from form
});

// Update Meaning Request (from MeaningsEditRequest)
export const UpdateMeaningRequestSchema = z.object({
  meaning: z.string().nullable().optional(),
  part_of_speech_id: z.number().nullable().optional(),
  sentence: z.string().nullable().optional(),
  attributes: z.array(z.number()).nullable().optional(),
  author_id: z.number().nullable().optional(),
});

// Delete Meaning Request
export const DeleteMeaningRequestSchema = z.object({
  entityId: z.number(), // The meaning ID to delete
});

// Create Word Attribute Request
export const CreateWordAttributeRequestSchema = z.object({
  attribute: z.string(),
});

// Update Word Attribute Request
export const UpdateWordAttributeRequestSchema = z.object({
  attribute: z.string(),
});

// Update Related Word Request
export const UpdateRelatedWordRequestSchema = z.object({
  relatedWordId: z.number(),
  newRelationType: z.string(),
});

// Delete Related Word Request
export const DeleteRelatedWordRequestSchema = z.object({
  relatedWordId: z.number(),
});

// Create Related Word Request
export const CreateRelatedWordRequestSchema = z.object({
  relatedWordId: z.number(),
  relationType: z.string(),
});

// Delete Related Phrase Request
export const DeleteRelatedPhraseRequestSchema = z.object({
  relatedPhraseId: z.number(),
});

// Create Related Phrase Request
export const CreateRelatedPhraseRequestSchema = z.object({
  phraseId: z.number(),
  description: z.string().optional(),
});

// Create Author Request
export const CreateAuthorRequestSchema = z.object({
  name: z.string(),
});

export const CreateMeaningAttributeRequestSchema = z.object({
  attribute: z.string(),
});
