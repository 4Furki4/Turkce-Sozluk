'use client'
import React, { useState } from 'react'
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure, Tabs, Tab, Button } from "@heroui/react";
import WordEditRequest from '../edit-request-modal/word-edit-request';
import MeaningsEditRequest from '../edit-request-modal/meanings-edit-request';
import RelatedWordsEditTabContent from '../edit-request-modal/related-words-edit-tab-content';
import RelatedPhrasesEditTabContent from '../edit-request-modal/related-phrases-edit-tab-content';
import { useTranslations } from 'next-intl';
import { WordSearchResult } from '@/types';
import RelatedWordEditRequestModal from '../edit-request-modal/related-word-edit-request-modal';
import RelatedWordDeleteRequestModal from '../edit-request-modal/related-word-delete-request-modal';
import { Session } from '@/src/lib/auth-client';
import { useSnapshot } from "valtio"
import { preferencesState } from "@/src/store/preferences"
import { cn } from '@/lib/utils';
type RelatedWordItemType = NonNullable<WordSearchResult['word_data']['relatedWords']>[number];

export default function WordCardRequestModal({ word: { word_data }, session, isOpen, onOpenChange, onClose }: { word: WordSearchResult, session: Session | null, isOpen: boolean, onOpenChange: (isOpen: boolean) => void, onClose: () => void }) {
    const t = useTranslations("WordCard");
    const tRequests = useTranslations("Requests");
    const [selectedRelatedWord, setSelectedRelatedWord] = useState<{ id: number; related_word_id: number; related_word_name: string; relation_type?: string | undefined; } | null>(null);
    const { isBlurEnabled } = useSnapshot(preferencesState);
    const { isOpen: isEditRelOpen, onOpen: onEditRelOpen, onClose: onEditRelClose, onOpenChange: onEditRelOpenChange } = useDisclosure();
    const { isOpen: isCreateRelOpen, onOpen: onCreateRelOpen, onClose: onCreateRelClose, onOpenChange: onCreateRelOpenChange } = useDisclosure();
    const { isOpen: isDeleteRelOpen, onOpen: onDeleteRelOpen, onClose: onDeleteRelClose, onOpenChange: onDeleteRelOpenChange } = useDisclosure();

    const handleEditRelatedWord = (relatedWord: RelatedWordItemType) => {
        setSelectedRelatedWord({ id: relatedWord.related_word_id, ...relatedWord });
        onEditRelOpen();
    };

    const handleDeleteRelatedWord = (relatedWord: RelatedWordItemType) => {
        setSelectedRelatedWord({ id: relatedWord.related_word_id, ...relatedWord });
        onDeleteRelOpen();
    };
    return (
        <>
            <Modal motionProps={{
                variants: {
                    enter: {
                        opacity: 1,
                        transition: {
                            duration: 0.1,
                            ease: 'easeInOut',
                        }
                    },
                    exit: {
                        opacity: 0,
                        transition: {
                            duration: 0.1,
                            ease: 'easeInOut',
                        }
                    },
                }
            }} classNames={{
                base: cn(
                    "bg-background border-2 border-border rounded-sm p-2 w-full",
                    { "bg-background/60 shadow-medium backdrop-blur-md backdrop-saturate-150 transition-transform-background motion-reduce:transition-none": isBlurEnabled }
                )
            }} size="3xl" scrollBehavior="inside" backdrop="opaque" isOpen={isOpen} onOpenChange={onOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>
                                {t("EditWord")}
                            </ModalHeader>
                            <ModalBody>
                                <Tabs color="primary" disableAnimation classNames={{
                                    tabList: "w-full bg-primary/10 border border-primary",
                                    tabContent: "text-primary md:w-full",
                                    tab: "data-[selected=true]:bg-primary/60",
                                }}>
                                    <Tab value={"words"} title={t("Words")}>
                                        <WordEditRequest data={{ word_data }} onClose={onClose} />
                                    </Tab>
                                    <Tab value={"meanings"} title={t("Meanings")}>
                                        <MeaningsEditRequest meanings={word_data.meanings} />
                                    </Tab>
                                    <Tab value={"related_words"} title={tRequests("RelatedWordsTabTitle")}>
                                        <RelatedWordsEditTabContent
                                            relatedWords={word_data.relatedWords?.map(rw => ({
                                                id: rw.related_word_id,
                                                related_word: {
                                                    id: rw.related_word_id,
                                                    word: rw.related_word_name,
                                                },
                                                relation_type: rw.relation_type || '',
                                            })) || []}
                                            onOpenEditModal={(relatedWordId, relationType) => {
                                                const wordToEdit = word_data.relatedWords?.find(rw => rw.related_word_id === relatedWordId);
                                                if (wordToEdit) {
                                                    setSelectedRelatedWord({
                                                        id: wordToEdit.related_word_id,
                                                        related_word_id: wordToEdit.related_word_id,
                                                        related_word_name: wordToEdit.related_word_name,
                                                        relation_type: relationType,
                                                    });
                                                    onEditRelOpen();
                                                }
                                            }}
                                            onOpenDeleteModal={(relationshipId, relatedWordName) => {
                                                const wordToDelete = word_data.relatedWords?.find(rw => rw.related_word_id === relationshipId);
                                                if (wordToDelete) {
                                                    setSelectedRelatedWord({
                                                        id: relationshipId,
                                                        related_word_id: wordToDelete.related_word_id,
                                                        related_word_name: relatedWordName,
                                                        relation_type: wordToDelete.relation_type,
                                                    });
                                                    onDeleteRelOpen();
                                                }
                                            }}
                                            currentWordId={word_data.word_id}
                                            session={session}
                                        />
                                    </Tab>
                                    <Tab value={"related_phrases"} title={tRequests("RelatedPhrasesTabTitle")}>
                                        <RelatedPhrasesEditTabContent
                                            currentWordId={word_data.word_id}
                                            relatedPhrases={word_data.relatedPhrases || []}
                                            session={session}
                                        // Pass phrase edit/delete handlers when ready
                                        />
                                    </Tab>
                                </Tabs>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onClose}>
                                    {t('Close')}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
            {/* Related Word Edit Modal */}
            {selectedRelatedWord && (
                <RelatedWordEditRequestModal
                    isOpen={isEditRelOpen}
                    onClose={() => {
                        onEditRelClose();
                        setSelectedRelatedWord(null);
                    }}
                    wordId={word_data.word_id}
                    relatedWord={selectedRelatedWord}
                    session={session}
                />
            )}

            {/* Related Word Delete Modal */}
            {selectedRelatedWord && (
                <RelatedWordDeleteRequestModal
                    isOpen={isDeleteRelOpen}
                    onClose={() => {
                        onDeleteRelClose();
                        setSelectedRelatedWord(null);
                    }}
                    wordId={word_data.word_id}
                    relatedWord={selectedRelatedWord}
                    session={session}
                />
            )}
        </>
    )
}
