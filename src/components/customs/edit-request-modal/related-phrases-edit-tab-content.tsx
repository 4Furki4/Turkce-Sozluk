import React, { useState } from 'react';
import { Button, useDisclosure } from "@heroui/react";
import { Card, CardBody } from "@heroui/card";
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Session } from '@/src/lib/auth-client';
import RelatedPhraseCreateRequestModal from './related-phrase-create-request-modal';
import RelatedPhraseDeleteRequestModal from './related-phrase-delete-request-modal';
import { useSnapshot } from "valtio"
import { preferencesState } from "@/src/store/preferences"
export type RelatedPhraseItemType = {
  related_phrase_id: number;
  related_phrase: string; // Changed from related_phrase_text
  description?: string | null; // Added for editing
};

interface RelatedPhrasesEditTabContentProps {
  currentWordId: number;
  relatedPhrases: RelatedPhraseItemType[];
  session: Session | null;
  // onOpenPhraseDeleteModal: (phrase: RelatedPhraseItemType) => void;
}

const RelatedPhrasesEditTabContent: React.FC<RelatedPhrasesEditTabContentProps> = ({
  currentWordId,
  relatedPhrases,
  session,
}) => {
  const t = useTranslations('Requests');
  const tWordCard = useTranslations('WordCard');
  const tActions = useTranslations('Actions');
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onOpenChange: onCreateOpenChange } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange } = useDisclosure();
  const [phraseToDelete, setPhraseToDelete] = useState<RelatedPhraseItemType | null>(null);
  const { isBlurEnabled } = useSnapshot(preferencesState);


  if (!session) {
    return <p>{t('SignInToSuggestChanges')}</p>;
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onPress={onCreateOpen} color="primary" startContent={<Plus size={16} />}>
          {tActions('SuggestNewPhrase')}
        </Button>
      </div>
      {phraseToDelete && (
        <RelatedPhraseDeleteRequestModal
          isOpen={isDeleteOpen}
          onClose={onDeleteOpenChange}
          wordId={currentWordId}
          relatedPhrase={phraseToDelete}
          session={session}
        />
      )}
      <RelatedPhraseCreateRequestModal isOpen={isCreateOpen} onOpenChange={onCreateOpenChange} wordId={currentWordId} session={session} />

      {(!relatedPhrases || relatedPhrases.length === 0) ? (
        <div className="text-center text-gray-500">
          <p>{tWordCard('NoRelatedPhrasesFound')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {relatedPhrases.map((phrase) => (
            <Card isBlurred={isBlurEnabled} key={phrase.related_phrase_id}>
              <CardBody className="flex flex-row justify-between items-center">
                <div>
                  {/* Phrases might not be directly linkable like words, adjust as needed */}
                  <span className="font-medium">{phrase.related_phrase}</span>
                </div>
                {session && (
                  <div className="flex gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => {
                        setPhraseToDelete(phrase);
                        onDeleteOpen();
                      }}
                      aria-label={`Delete related phrase: ${phrase.related_phrase}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RelatedPhrasesEditTabContent;
