"use client"
import { api } from "@/src/trpc/react";
import {
  CardBody,
  Chip,
  Spinner,
  Button,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  CardHeader,
  CardFooter
} from "@heroui/react";
import { EntityTypes, Actions, Status } from "@/db/schema/requests";
import { useState, useCallback, useMemo } from "react";
import { useRouter } from "@/src/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Clock
} from "lucide-react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { toast } from "sonner";
import RequestDetails from "@/src/components/requests/details/RequestDetails";
import DisplayWordBeingModified from "@/src/components/shared/DisplayWordBeingModified";
import CustomCard from "@/src/components/customs/heroui/custom-card";


export interface RequestDetailProps {
  requestId: number;
}

type EntityData = Record<string, any>;

export default function RequestDetail({ requestId }: RequestDetailProps) {
  console.log('[RequestDetail] Props:', requestId);
  const t = useTranslations("Requests");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const { executeRecaptcha } = useGoogleReCaptcha()
  const entityTypeLabels = useMemo<Record<EntityTypes, string>>(() => ({
    words: t("entityTypes.words"),
    meanings: t("entityTypes.meanings"),
    roots: t("entityTypes.roots"),
    related_words: t("entityTypes.related_words"),
    part_of_speechs: t("entityTypes.part_of_speechs"),
    examples: t("entityTypes.examples"),
    authors: t("entityTypes.authors"),
    word_attributes: t("entityTypes.word_attributes"),
    meaning_attributes: t("entityTypes.meaning_attributes"),
    related_phrases: t("entityTypes.related_phrases"),
    pronunciations: t("entityTypes.pronunciations"),
  }), [t]);

  const actionLabels = useMemo<Record<Actions, string>>(() => ({
    create: t("actions.create"),
    update: t("actions.update"),
    delete: t("actions.delete"),
  }), [t]);

  const statusLabels = useMemo<Record<Status, string>>(() => ({
    pending: t("status.pending"),
    approved: t("status.approved"),
    rejected: t("status.rejected"),
  }), [t]);

  const actionColors = useMemo<Record<Actions, "primary" | "warning" | "danger">>(() => ({
    create: "primary",
    update: "warning",
    delete: "danger",
  }), []);

  const statusColors = useMemo<Record<Status, "primary" | "success" | "danger">>(() => ({
    pending: "primary",
    approved: "success",
    rejected: "danger",
  }), []);

  // Fetch request data
  const { data, isLoading, isError } = api.request.getUserRequest.useQuery({ requestId });

  // Cancel request mutation
  const cancelRequestMutation = api.request.cancelRequest.useMutation({
    onSuccess: () => {
      router.push("/my-requests");
    },
  });

  // Update request mutation
  const updateRequestMutation = api.request.updateRequest.useMutation({
    onSuccess: () => {
      router.push("/my-requests");
    },
  });

  const handleCancelRequest = useCallback(async () => {
    if (!executeRecaptcha) {
      toast.error(t("Errors.captchaError"));
      return;
    }
    try {
      const captchaToken = await executeRecaptcha("cancel_request");
      cancelRequestMutation.mutate({ requestId, captchaToken });
    } catch (error) {
      console.error("reCAPTCHA execution failed:", error);
      toast.error(t("Errors.captchaError"));
    }
  }, [cancelRequestMutation, requestId, executeRecaptcha, t]);

  const handleUpdateRequest = useCallback(async () => {
    if (!executeRecaptcha) {
      toast.error(t("Errors.captchaError"));
      return;
    }
    try {
      const captchaToken = await executeRecaptcha("update_request");
      updateRequestMutation.mutate({
        requestId,
        newData: editedData,
        reason: reason || data?.request.reason || "",
        captchaToken,
      });
    } catch (error) {
      console.error("reCAPTCHA execution failed:", error);
      toast.error(t("Errors.captchaError"));
    }
  }, [updateRequestMutation, requestId, editedData, reason, data, executeRecaptcha, t]);

  const handleEditData = (key: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (isLoading) {
    return (

      <Spinner className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-center">
        <p className="text-danger">{t("errors.requestNotFound")}</p>
        <Button
          color="primary"
          variant="flat"
          onPress={() => router.push("/my-requests")}
          className="mt-4"
        >
          {t("buttons.backToRequests")}
        </Button>
      </div>
    );
  }

  const request = data.request;
  console.log('[RequestDetail] Full request object:', request);
  let newData: Record<string, any> = {};

  // Extract new data from request
  try {
    if (request.newData && typeof request.newData === 'string') {
      newData = JSON.parse(request.newData);
    } else if (request.newData && typeof request.newData === 'object') {
      newData = request.newData as Record<string, any>;
    }
  } catch (error) {
    console.error("Failed to parse new data:", error);
  }

  // Get entity data from the API response
  const entityData = data.entityData as EntityData | null;
  console.log('[RequestDetail] Memoized entityData:', entityData, 'Memoized newData:', newData);

  const isPending = request.status === "pending";
  const isCreateRequest = data.request.action === "create";

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button
          color="default"
          variant="flat"
          onPress={() => router.push("/my-requests")}
          startContent={<ArrowLeft className="h-4 w-4" />}
        >
          {t("buttons.back")}
        </Button>
      </div>

      <CustomCard className="border-default shadow-xs">
        <CardHeader className="border-b border-default px-6 py-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold text-foreground ">
                {t("title")}{` #${request.id}: ${entityTypeLabels[request.entityType]} - ${actionLabels[request.action]}`}
              </h2>
              {request.entityType === "words" && (request.action === "update" || request.action === "delete") && request.entityId && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-default-600">{t("details.modifyingWordLabel")}:</span>
                  <DisplayWordBeingModified wordId={request.entityId} />
                </div>
              )}
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm">
              <div className="text-default-500 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {request.requestDate
                  ? formatDistanceToNow(new Date(request.requestDate), {
                    addSuffix: true,
                  })
                  : t("details.unknownDate")}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Chip
                  color={statusColors[request.status]}
                  radius="sm"
                >
                  {statusLabels[request.status]}
                </Chip>
                <Chip
                  color={actionColors[request.action]}
                  variant="flat"
                  radius="sm"
                  classNames={{
                    base: "px-3 py-1",
                    content: "font-medium"
                  }}
                >
                  {actionLabels[request.action]}
                </Chip>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardBody className="px-6 py-5">
          {/* Request Reason */}
          {request.reason && (
            <div className="mb-8 rounded-lg border border-default p-4">
              <h3 className="mb-2 text-sm uppercase text-default-500">{t("details.reason")}</h3>
              <p className="text-foreground">{request.reason}</p>
            </div>
          )}

          {/* Main Content */}
          <RequestDetails
            entityType={request.entityType}
            action={request.action}
            newData={newData}
            oldData={entityData}
          />
        </CardBody>

        {/* Actions */}
        {isPending && (
          <CardFooter className="border-t border-default px-6 py-4">
            <div className="flex justify-end gap-3">
              {!isEditing ? (
                <>
                  <Button
                    color="primary"
                    variant="flat"
                    onPress={() => setIsEditing(true)}
                  >
                    {t("buttons.edit")}
                  </Button>
                  <Button
                    color="danger"
                    onPress={onOpen} // Opens modal for cancel confirmation
                  >
                    {t("buttons.cancelRequest")}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    color="default"
                    variant="flat"
                    onPress={() => setIsEditing(false)}
                  >
                    {t("buttons.cancelEditing")}
                  </Button>
                  <Button
                    color="primary"
                    onPress={onOpen} // Opens modal for save changes confirmation
                  >
                    {t("buttons.saveChanges")}
                  </Button>
                </>
              )}
            </div>
          </CardFooter>
        )}
      </CustomCard>

      {/* Modal for cancel confirmation or edit updates */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          {(modalClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {isEditing ? t("details.updateRequestModalTitle") : t("details.cancelRequestModalTitle")}
              </ModalHeader>
              <ModalBody>
                {isEditing ? (
                  <>
                    <p>{t("prompts.confirmUpdateRequest")}</p>
                    <Textarea
                      label={t("inputs.reasonForChangeLabel")}
                      placeholder={t("inputs.reasonForChangePlaceholder")}
                      value={reason}
                      onValueChange={setReason}
                      className="mt-4"
                    />
                  </>
                ) : (
                  <p>{t("prompts.confirmCancelRequest")}</p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="flat" onPress={modalClose}>
                  {t("buttons.close")}
                </Button>
                <Button
                  color={isEditing ? "primary" : "danger"}
                  onPress={() => {
                    if (isEditing) {
                      handleUpdateRequest();
                    } else {
                      handleCancelRequest();
                    }
                    modalClose(); // Close modal after action
                  }}
                >
                  {isEditing ? t("buttons.confirmUpdate") : t("buttons.confirmCancel")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
