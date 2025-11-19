import { z } from "zod";

export const EditMeaningSchema = z.object({
    id: z.string().or(z.number()).optional().nullable(),
    meaning: z.string().min(1, "Meaning input cannot be empty!"),
    attributes: z.array(z.number()).optional().nullable(),
    partOfSpeechId: z.number({ required_error: "Part of Speech is required!" }).optional().nullable(),
    exampleSentence: z.string().min(5).optional().nullable(),
    authorId: z.number().optional().nullable()
})

export const EditWordSchema = z.object({
    id: z.number(),
    name: z.string().min(1, "Word must have a name."),
    attributes: z.array(z.number()).optional().nullable(),
    language: z.string().optional().nullable(),
    root: z.string().optional().nullable(),
    phonetic: z.string().optional().nullable(),
    suffix: z.string().optional().nullable(),
    prefix: z.string().optional().nullable(),
    meanings: z.array(EditMeaningSchema).min(1)
})

export const AddWordSchema = z.object({
    name: z.string(),
    language: z.string().optional(),
    phonetic: z.string().optional(),
    root: z.string().optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    requestType: z.string().optional(),
    attributes: z.number().array().optional(),
    meanings: z.array(z.object({
        meaning: z.string(),
        partOfSpeechId: z.number().optional().nullable(),
        attributes: z.array(z.number()),
        example: z.object({
            sentence: z.string(),
            author: z.number().optional().nullable()
        }).optional(),
        imageUrl: z.string().optional()
    }
    ))
})

export const DailyWordSchema = z.object({
    id: z.number().optional(),
    wordId: z.number({ required_error: "Word is required" }),
    date: z.string({ required_error: "Date is required" }),
})

export const GalatiMeshurSchema = z.object({
    id: z.number().optional(),
    wordId: z.number({ required_error: "Word is required" }),
    explanation: z.string().min(1, "Explanation is required"),
    correctUsage: z.string().min(1, "Correct usage is required"),
})

export const MisspellingSchema = z.object({
    id: z.number().optional(),
    correctWordId: z.number({ required_error: "Correct word is required" }),
    incorrectSpelling: z.string().min(1, "Incorrect spelling is required"),
})