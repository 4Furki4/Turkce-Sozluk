import React from 'react';
import { Card, CardBody } from "@heroui/card";
import { Button, useDisclosure } from '@heroui/react';
import { Pencil, Trash2, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Session } from '@/src/lib/auth-client';
import RelatedWordCreateRequestModal from './related-word-create-request-modal';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';

// This is the data shape passed from the parent component after mapping
interface RelatedWordDisplayItem {
  id: number; // This is the ID of the relationship
  related_word: {
    id: number; // This is the ID of the related word itself
    word: string;
  };
  relation_type: string;
}

interface RelatedWordsEditTabContentProps {
  relatedWords: RelatedWordDisplayItem[];
  currentWordId: number;
  // The first param is the related_word.id, the second is the relation_type
  onOpenEditModal: (relatedWordId: number, relationType: string) => void;
  // The first param is the relationship id, the second is the related word's name
  onOpenDeleteModal: (relationshipId: number, relatedWordName: string) => void;
  session: Session | null;
}

const RelatedWordsEditTabContent: React.FC<RelatedWordsEditTabContentProps> = ({
  relatedWords,
  currentWordId,
  onOpenEditModal,
  onOpenDeleteModal,
  session,
}) => {
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const tActions = useTranslations('Actions');
  const tWordCard = useTranslations('WordCard');
  const tRelationTypes = useTranslations('RelationTypes');
  const { isBlurEnabled } = useSnapshot(preferencesState);

  if (!session) {
    return (
      <div className="text-center py-4">
        <p>{tWordCard('loginToSuggestChanges')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onPress={onCreateOpen} color="primary" variant="solid" startContent={<PlusCircle className="w-4 h-4" />}>
            {tActions('SuggestNewWord')}
          </Button>
        </div>
        {relatedWords && relatedWords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedWords.map((item) => (
              <Card isBlurred={isBlurEnabled} key={item.id} className="w-full">
                <CardBody className="flex flex-row items-center justify-between p-4">
                  <div>
                    <p className="font-semibold">{item.related_word.word}</p>
                    <p className="text-sm text-gray-500">{tRelationTypes(item.relation_type)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => onOpenEditModal(item.related_word.id, item.relation_type)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      color="danger"
                      onPress={() => onOpenDeleteModal(item.id, item.related_word.word)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p>{tWordCard('NoRelatedWordsFound')}</p>
          </div>
        )}
      </div>
      <RelatedWordCreateRequestModal
        isOpen={isCreateOpen}
        onClose={onCreateClose}
        wordId={currentWordId}
        session={session}
      />
    </>
  );
};

export default RelatedWordsEditTabContent;
