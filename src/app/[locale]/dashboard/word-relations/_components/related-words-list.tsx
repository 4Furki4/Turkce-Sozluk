"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import { Button, Card, CardBody, Spinner, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react"; // Added Select and SelectItem, Modal components
import { toast } from "sonner";

interface RelatedWord {
  id: number;
  name: string;
  relationType: string;
}

export interface RelatedWordsListProps {
  wordId: number;
  relatedWords: RelatedWord[];
  isLoading: boolean;
  onRelationRemoved: () => void;
  onRelationUpdated: () => void; // Added for refreshing data after update
}

export default function RelatedWordsList({
  wordId,
  relatedWords,
  isLoading,
  onRelationRemoved,
  onRelationUpdated, // Added prop
}: RelatedWordsListProps) {
  const t = useTranslations("Dashboard.WordRelations");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [editingRelationId, setEditingRelationId] = useState<number | null>(null);
  const [newRelationTypeForEdit, setNewRelationTypeForEdit] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [relationToDelete, setRelationToDelete] = useState<RelatedWord | null>(null);

  // Mutation to remove a related word
  const removeRelatedWordMutation = api.admin.wordRelations.removeRelatedWord.useMutation({
    onSuccess: () => {
      onRelationRemoved();
      toast.success(t("toast.relationRemovedSuccess"));
      setRemovingId(null);
    },
    onError: (error) => {
      toast.error(t("toast.relationRemovedError", { error: error.message }));
      setRemovingId(null);
    },
  });

  // Mutation to update a related word's type
  const updateRelatedWordMutation = api.admin.wordRelations.updateRelatedWordType.useMutation({
    onSuccess: () => {
      onRelationUpdated(); // Call prop to refresh parent data
      toast.success(t("toast.relationTypeUpdateSuccess"));
      setEditingRelationId(null);
    },
    onError: (error) => {
      toast.error(t("toast.relationTypeUpdateError", { error: error.message }));
    },
  });

  // Check if remove mutation is in progress for a specific ID
  const isRemoveMutationInProgress = (id: number) => removeRelatedWordMutation.status === "pending" && removingId === id;
  // Check if update mutation is in progress for a specific ID
  const isUpdateMutationInProgress = (id: number) => updateRelatedWordMutation.status === "pending" && editingRelationId === id;

  // Handle opening the delete confirmation modal
  const handleOpenDeleteModal = (relatedItem: RelatedWord) => {
    if (editingRelationId === relatedItem.id) setEditingRelationId(null);
    setRelationToDelete(relatedItem);
    setIsDeleteModalOpen(true);
  };

  // Handle confirming the removal of a related word
  const confirmRemoveRelation = () => {
    if (relationToDelete) {
      setRemovingId(relationToDelete.id);
      removeRelatedWordMutation.mutate({
        wordId,
        relatedWordId: relationToDelete.id,
      });
      setIsDeleteModalOpen(false);
      setRelationToDelete(null);
    }
  };

  // Get relation type display name
  const getRelationTypeDisplay = (relationType: string) => {
    const relationTypes: Record<string, string> = {
      relatedWord: t("relationTypes.relatedWord"),
      antonym: t("relationTypes.antonym"),
      synonym: t("relationTypes.synonym"),
      correction: t("relationTypes.correction"),
      compound: t("relationTypes.compound"),
      see_also: t("relationTypes.seeAlso"),
      turkish_equivalent: t("relationTypes.turkishEquivalent"),
      obsolete: t("relationTypes.obsolete"),
    };

    return relationTypes[relationType] || relationType;
  };

  const relationTypeOptions = Object.keys({
    relatedWord: "",
    antonym: "",
    synonym: "",
    correction: "",
    compound: "",
    see_also: "",
    turkish_equivalent: "",
    obsolete: "",
  }).map((key) => ({
    key: key, // Changed 'value' to 'key' for HeroUI Select items
    value: key, // Keep 'value' as well if it's used elsewhere, or ensure 'key' is primary identifier
    label: getRelationTypeDisplay(key),
  }));

  const handleEditClick = (relatedWordId: number, currentRelationType: string) => {
    if (removingId === relatedWordId) setRemovingId(null); // Cancel remove if editing same item
    setEditingRelationId(relatedWordId);
    setNewRelationTypeForEdit(currentRelationType);
  };

  const handleCancelEdit = () => {
    setEditingRelationId(null);
    setNewRelationTypeForEdit("");
  };

  const handleSaveEdit = (relatedWordId: number) => {
    if (!newRelationTypeForEdit) {
      toast.error(t("toast.selectRelationType")); // Assuming this key will be added
      return;
    }
    updateRelatedWordMutation.mutate({
      wordId,
      relatedWordId,
      newRelationType: newRelationTypeForEdit,
    });
  };

  const handleNewRelationTypeChange = (keys: "all" | Set<React.Key>) => {
    if (keys instanceof Set) {
      const firstKey = keys.values().next().value;
      if (firstKey !== undefined) {
        if (typeof firstKey === 'string') {
          setNewRelationTypeForEdit(firstKey);
        } else if (typeof firstKey === 'number') {
          setNewRelationTypeForEdit(String(firstKey));
        }
      } else {
        // Handle case where the set is empty (e.g., if deselection is possible and no item is selected)
        setNewRelationTypeForEdit("");
      }
    } else if (keys === "all") {
      // This case is typically for "Select All" in multi-select scenarios.
      // For single select, this branch might not be hit, but good to have for completeness.
      // Decide what 'all' means in this context, if anything. Maybe select the first option or clear.
    }
  };

  // Early return for loading state (no changes needed here)
  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex justify-center items-center p-6">
          <Spinner size="md" />
        </CardBody>
      </Card>
    );
  }

  // Early return for no related words (no changes needed here)
  if (relatedWords.length === 0) {
    return (
      <Card>
        <CardBody className="text-center">
          {t("noRelatedWords")}
        </CardBody>
      </Card>
    );
  }

  return (<>
    <Card>
      <CardBody className="p-0">
        <div className="divide-y">
          {relatedWords.map((relatedItem) => (
            <div key={relatedItem.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center">
              {editingRelationId === relatedItem.id ? (
                // Edit Mode UI (Stacked Layout)
                <div className="w-full flex flex-col gap-3">
                  <div className="font-medium">{relatedItem.name}</div>
                  <Select
                    aria-label={t("relationTypes.selectLabel", { defaultMessage: "Select relation type" })}
                    placeholder={t("relationTypes.placeholder", { defaultMessage: "Choose a relation" })}
                    selectedKeys={newRelationTypeForEdit ? [newRelationTypeForEdit] : []}
                    onSelectionChange={handleNewRelationTypeChange}
                    items={relationTypeOptions}
                    isDisabled={isUpdateMutationInProgress(relatedItem.id)}
                    className="w-full"
                    classNames={{
                      trigger: "p-2 border rounded-sm text-sm bg-background text-foreground border-border focus:ring-primary focus:border-primary",
                      popoverContent: "bg-background border-border"
                    }}
                  >
                    {(item: any) => (
                      <SelectItem key={item.value} textValue={item.label}>
                        {item.label}
                      </SelectItem>
                    )}
                  </Select>
                  <div className="flex items-center space-x-2 justify-end">
                    <Button
                      onPress={() => handleSaveEdit(relatedItem.id)}
                      isDisabled={isUpdateMutationInProgress(relatedItem.id)}
                      color="primary"
                      size="sm"
                    >
                      {isUpdateMutationInProgress(relatedItem.id) ? (
                        <div className="flex items-center gap-1">
                          <Spinner size="sm" /> {t("editingButton", { defaultMessage: "Saving..." })}
                        </div>
                      ) : t("saveButton", { defaultMessage: "Save" })}
                    </Button>
                    <Button
                      onPress={handleCancelEdit}
                      isDisabled={isUpdateMutationInProgress(relatedItem.id)}
                      variant="ghost"
                      size="sm"
                    >
                      {t("cancelButton", { defaultMessage: "Cancel" })}
                    </Button>
                  </div>
                </div>
              ) : (
                // Display Mode UI
                <>
                  <div className="flex-grow mb-2 sm:mb-0">
                    <div className="font-medium">{relatedItem.name}</div>
                    <div className="text-sm text-secondary">
                      {getRelationTypeDisplay(relatedItem.relationType)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Button
                      onPress={() => handleEditClick(relatedItem.id, relatedItem.relationType)}
                      isDisabled={isRemoveMutationInProgress(relatedItem.id) || !!editingRelationId}
                      variant="light"
                      size="sm"
                    >
                      {t("editButton", { defaultMessage: "Edit" })}
                    </Button>
                    <Button
                      onPress={() => handleOpenDeleteModal(relatedItem)}
                      isDisabled={isRemoveMutationInProgress(relatedItem.id) || !!editingRelationId} // Disable if any item is being edited
                      color="danger"
                      variant="light"
                      size="sm"
                    >
                      {isRemoveMutationInProgress(relatedItem.id) ? (
                        <div className="flex items-center gap-1">
                          <Spinner size="sm" /> {t("removing")}
                        </div>
                      ) : t("remove")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
    {isDeleteModalOpen && relationToDelete && (
      <Modal isOpen={isDeleteModalOpen} onOpenChange={() => { setIsDeleteModalOpen(false); setRelationToDelete(null); }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {t("deleteModal.title")}
              </ModalHeader>
              <ModalBody>
                <p>
                  {t("deleteModal.confirmationText", {
                    wordName: relationToDelete!.name,
                    relationType: getRelationTypeDisplay(relationToDelete!.relationType),
                  })}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={() => { setIsDeleteModalOpen(false); setRelationToDelete(null); }}>
                  {t("deleteModal.cancelButton")}
                </Button>
                <Button color="danger" onPress={confirmRemoveRelation} isLoading={removeRelatedWordMutation.status === 'pending' && removingId === relationToDelete!.id}>
                  {t("deleteModal.confirmButton")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    )}
  </>
  );
}
