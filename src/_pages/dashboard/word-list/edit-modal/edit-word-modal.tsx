"use client"
import { api } from '@/src/trpc/react';
import { EditMeaningForm, EditWordForm, Language } from '@/types';
import { Button, ButtonGroup, Card, CardBody, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner } from "@heroui/react";
import React, { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form';
import WordNameInput from './inputs/word/word-name-input';
import WordLanguageInput from './inputs/word/word-language-input';
import WordRootInput from './inputs/word/word-root-input';
import WordPhoneticInput from './inputs/word/word-phonetic-input';
import WordSuffixInput from './inputs/word/word-suffix-input';
import WordPrefixInput from './inputs/word/word-prefix-input';
import MeaningInput from './inputs/meaning/meaning-input';
import PartOfSpeechInput from './inputs/meaning/part-of-speech-input';
import AttributesInput from './inputs/meaning/attributes-input';
import ExampleSentenceInput from './inputs/meaning/example-sentence-input';
import AuthorInput from './inputs/meaning/author-input';
import WordAttributesInput from './inputs/word/word-attributes-input';
import { BetweenVerticalEnd, BetweenVerticalStart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const editMeaningFormSchema = z.object({
    id: z.string().or(z.number()).optional().nullable(),
    meaning: z.string().min(1, "Meaning input cannot be empty!"),
    attributes: z.union([z.array(z.string()), z.undefined()]),
    partOfSpeechId: z.string().optional(),
    exampleSentence: z.union([z.string(), z.undefined()]),
    authorId: z.union([z.string(), z.undefined()])
})

const editWordFormSchema = z.object({
    name: z.string().min(1, "Word must have a name."),
    attributes: z.array(z.string()).optional(),
    language: z.string().or(z.null()).optional(),
    root: z.string().optional(),
    phonetic: z.string().optional(),
    suffix: z.string().optional(),
    prefix: z.string().optional(),
    meanings: z.array(editMeaningFormSchema.partial()).min(1)
}).refine(schema => {
    const hasLang = Boolean(schema.language)
    const hasRoot = Boolean(schema.root)
    if (!hasLang && hasRoot) {
        return hasLang
    }
    return true
}, {
    message: "Language is required when root is specified",
    path: ["language"],
})

export default function EditWordModal({
    isOpen,
    onOpenChange,
    wordName,
    languages,
    partOfSpeeches,
    wordsPerPage,
    skip
}: {
    isOpen: boolean;
    onOpen: () => void;
    onOpenChange: () => void;
    wordName: string;
    languages: Language[];
    partOfSpeeches: {
        id: string;
        partOfSpeech: string;
    }[];
    wordsPerPage: number;
    skip: number;
}) {
    const { data, isError, status, isLoading } = api.admin.getWordToEdit.useQuery(wordName, {
        enabled: isOpen,
    })
    const { data: wordAttributes, } = api.params.getWordAttributes.useQuery()
    const { data: meaningAttributesData } = api.params.getMeaningAttributes.useQuery()
    const { data: authorsData } = api.params.getExampleSentenceAuthors.useQuery()
    const { control, setValue, reset, handleSubmit, setError, watch, formState: { errors } } = useForm<EditWordForm>({
        resolver: zodResolver(editWordFormSchema),
    })
    const { fields, append, prepend, remove } = useFieldArray({
        name: "meanings",
        control,
        rules: {
            required: {
                message: "words must have at least one meaning.",
                value: true
            },
            minLength: {
                value: 1,
                message: "words must have at least one meaning.",
            }
        },
    })
    const utils = api.useUtils()
    const editWordMutation = api.admin.editWord.useMutation({
        onSuccess: async (data) => {
            toast.success("Successfully updated.")
            await utils.word.getWords.refetch({
                skip,
                take: wordsPerPage
            })
        },
        onError: (data) => {
            toast.error(data.message)
        }
    })

    const word_data = data ? data[0].word_data : undefined
    const attributes = word_data?.attributes?.map(att => (att.attribute_id.toString())) ?? []
    const language = word_data?.root.language_code ?? ''
    const name = word_data?.word_name ?? ''
    const root = word_data?.root.root ?? ''
    const phonetic = word_data?.phonetic ?? ''
    const prefix = word_data?.prefix ?? ''
    const suffix = word_data?.suffix ?? ''
    const meaningAttributes = meaningAttributesData?.map((meaningAttribute) => ({
        ...meaningAttribute,
        id: meaningAttribute.id.toString()
    })) ?? []

    const authors = authorsData?.map(author => ({
        ...author,
        id: author.id.toString()
    })) ?? []
    const meanings: EditMeaningForm[] = word_data?.meanings.map((m) => ({
        id: m.meaning_id,
        meaning: m.meaning,
        exampleSentence: m.sentence ?? '',
        partOfSpeechId: m.part_of_speech_id?.toString(),
        attributes: m.attributes?.map((att) => att.attribute_id.toString()),
        authorId: m.author_id?.toString(),
    })) ?? []
    const emptyMeaningValues: EditMeaningForm = {
        id: '',
        attributes: [],
        authorId: '',
        exampleSentence: '',
        meaning: '',
        partOfSpeechId: ''
    }
    useEffect(() => {
        const defaultValues = { attributes, language, name, root, phonetic, prefix, suffix, meanings }
        reset(defaultValues)
    }, [name, language, JSON.stringify(attributes), language, root, phonetic])

    const discardChanges = () => {
        const defaultValues = { attributes, language, name, root, phonetic, prefix, suffix, meanings }
        reset(defaultValues)
        toast.success("Changes discarded!")
    }
    function onSubmit(data: EditWordForm) {
        if (data.language && !data.root) {
            setError("root", {
                message: "Please specify the root when language is selected"
            })
            return false
        }
        const preparedData = {
            id: word_data!.word_id,
            name: data.name,
            meanings: data.meanings.map((m) => ({
                id: m.id,
                meaning: m.meaning,
                attributes: m.attributes?.map((at) => parseInt(at)),
                partOfSpeechId: m.partOfSpeechId ? parseInt(m.partOfSpeechId) : null,
                authorId: m.authorId ? parseInt(m.authorId) : null,
                exampleSentence: m.exampleSentence === "" ? null : m.exampleSentence,
            })),
            attributes: data.attributes?.map((att) => (parseInt(att))),
            language: data.language,
            root: data.root,
            phonetic: data.phonetic,
            prefix: data.prefix,
            suffix: data.suffix
        }
        editWordMutation.mutate(preparedData)
    }
    if (isOpen && isLoading) {
        return <Spinner className='absolute top-1/2 left-1/2 translate-x-1/2 translate-y-1/2' />
    }
    if (isError || !data) {
        return <></> // TODO: handle error management when no data for the word wanted to be edited
    }
    return (
        <Modal placement='center' size='5xl' backdrop='blur' scrollBehavior='outside' isOpen={isOpen} onOpenChange={onOpenChange} key={`edit-word-modal-${wordName}`}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            <h5>Edit Word: <b>{wordName}</b></h5>
                        </ModalHeader>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <ModalBody>
                                <WordNameInput control={control} />
                                <div className='grid sm:grid-cols-2 gap-2 '>
                                    <WordPhoneticInput control={control} />
                                    <WordAttributesInput setFieldValue={setValue} key={wordName} control={control} wordAttributes={wordAttributes ?? []} selectedWordAttributes={data[0].word_data.attributes ?? []} />
                                </div>
                                <div className='grid sm:grid-cols-2 gap-2 '>
                                    <WordLanguageInput control={control} languages={languages} selectedLanguage={data[0].word_data.root.language_code} setFieldValue={setValue} />
                                    <WordRootInput control={control} />
                                </div>
                                <div className='grid sm:grid-cols-2 gap-2'>
                                    <WordPrefixInput control={control} />
                                    <WordSuffixInput control={control} />
                                </div>
                                {fields.length > 0 ? fields.map((field, index) => (
                                    <Card radius='md' className="flex-col gap-4" key={field.id}>
                                        <Button radius='md' variant='light' color='danger' isIconOnly
                                            className='absolute top-2 right-3 z-50'
                                            onPress={() => remove(index)}
                                        >
                                            <div className='sr-only'>
                                                Remove the meaning
                                            </div>
                                            <Trash2 />
                                        </Button>
                                        <CardBody className="flex flex-col gap-2 mt-4">
                                            <MeaningInput index={index} control={control} />
                                            <div className='grid sm:grid-cols-2 gap-2 '>
                                                <PartOfSpeechInput setFieldValue={setValue} index={index} control={control} partOfSpeeches={partOfSpeeches} selectedPartOfSpeechId={meanings[index]?.partOfSpeechId} />
                                                <AttributesInput control={control} index={index} selectedAttributes={meanings[index]?.attributes ?? []} setFieldValue={setValue} attributes={meaningAttributes} />
                                            </div>
                                            <div className='grid sm:grid-cols-2 gap-2 '>
                                                <ExampleSentenceInput control={control} index={index} />
                                                <AuthorInput control={control} index={index} authors={authors} selectedAuthor={meanings[index]?.authorId} setFieldValue={setValue} />
                                            </div>
                                        </CardBody>
                                    </Card>
                                )) : (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>
                                            You must add a meaning!
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <ButtonGroup radius='md' className="w-full gap-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                                    <Button
                                        type="button"
                                        radius='md'
                                        onPress={() => {
                                            prepend(emptyMeaningValues);
                                        }}
                                        endContent={<BetweenVerticalStart />}
                                    >
                                        Prepend <span className="max-sm:hidden">Meaning</span>
                                    </Button>
                                    <Button
                                        radius='md'
                                        type="button"
                                        onPress={() => {
                                            append(emptyMeaningValues);
                                        }}
                                        endContent={<BetweenVerticalEnd />}
                                    >
                                        Append <span className="max-sm:hidden">Meaning</span>
                                    </Button>
                                    <Button type='button' onPress={discardChanges} color='danger'>
                                        Discard Changes
                                    </Button>
                                    <Button type='submit' color='primary' isLoading={editWordMutation.isPending}>
                                        Submit
                                    </Button>
                                </ButtonGroup>
                            </ModalFooter>
                        </form>
                    </>
                )}
            </ModalContent>
        </Modal>
    )
}
