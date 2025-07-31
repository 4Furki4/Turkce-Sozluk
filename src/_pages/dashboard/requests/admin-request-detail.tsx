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
  Clock,
  Check,
  X
} from "lucide-react";
import { toast } from "sonner";
import RequestDetails from "@/src/components/requests/details/RequestDetails";
import DisplayWordBeingModified from "@/src/components/shared/DisplayWordBeingModified";
import CustomCard from "@/src/components/customs/heroui/custom-card";

export interface AdminRequestDetailProps {
  requestId: number;
}

type EntityData = Record<string, any>;

export default function AdminRequestDetail({ requestId }: AdminRequestDetailProps) {
  const t = useTranslations("Requests");
  const tDashboard = useTranslations("Dashboard");
  const router = useRouter();
  const [rejectReason, setRejectReason] = useState("");
  const { isOpen: isRejectModalOpen, onOpen: onRejectModalOpen, onClose: onRejectModalClose } = useDisclosure();
  const { isOpen: isApproveModalOpen, onOpen: onApproveModalOpen, onClose: onApproveModalClose } = useDisclosure();

  // Entity type labels
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

  // Action labels
  const actionLabels = useMemo<Record<Actions, string>>(() => ({
    create: t("actions.create"),
    update: t("actions.update"),
    delete: t("actions.delete"),
  }), [t]);

  // Status labels
  const statusLabels = useMemo<Record<Status, string>>(() => ({
    pending: t("status.pending"),
    approved: t("status.approved"),
    rejected: t("status.rejected"),
  }), [t]);

  // Status colors
  const statusColors = useMemo<Record<Status, "default" | "primary" | "secondary" | "success" | "warning" | "danger">>(() => ({
    pending: "warning",
    approved: "success",
    rejected: "danger",
  }), []);

  // Action colors
  const actionColors = useMemo<Record<Actions, "default" | "primary" | "secondary" | "success" | "warning" | "danger">>(() => ({
    create: "primary",
    update: "warning",
    delete: "danger",
  }), []);

  // Fetch request data using admin endpoint
  const { data, isLoading, isError, refetch } = api.request.getRequestDetails.useQuery({
    requestId,
  });

  // Approve request mutation
  const approveRequestMutation = api.request.approveRequest.useMutation({
    onSuccess: () => {
      toast.success("Request approved successfully");
      refetch();
      onApproveModalClose();
    },
    onError: (error) => {
      toast.error(`Error approving request: ${error.message}`);
    },
  });

  // Reject request mutation
  const rejectRequestMutation = api.request.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success("Request rejected successfully");
      refetch();
      onRejectModalClose();
      setRejectReason("");
    },
    onError: (error) => {
      toast.error(`Error rejecting request: ${error.message}`);
    },
  });

  const handleApprove = useCallback(() => {
    approveRequestMutation.mutate({ requestId });
  }, [approveRequestMutation, requestId]);

  const handleReject = useCallback(() => {
    rejectRequestMutation.mutate({
      requestId,
      reason: rejectReason.trim() || undefined,
    });
  }, [rejectRequestMutation, requestId, rejectReason]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-danger">Request not found or you don&apos;t have permission to view it</p>
        <Button
          color="primary"
          variant="flat"
          onPress={() => router.push("/dashboard/requests")}
          className="mt-4"
        >
          Back to Requests
        </Button>
      </div>
    );
  }

  const { request, user, entityData } = data;
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

  const isPending = request.status === "pending";
  const isApproved = request.status === "approved";
  const isRejected = request.status === "rejected";

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button
          color="default"
          variant="flat"
          onPress={() => router.push("/dashboard/requests")}
          startContent={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Requests
        </Button>
      </div>

      <CustomCard className="border-default shadow-xs">
        <CardHeader className="border-b border-default px-6 py-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold text-foreground">
                Admin Request Details{` #${request.id}: ${entityTypeLabels[request.entityType]} - ${actionLabels[request.action]}`}
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
            {/* User Information */}
            {user && (
              <div className="flex items-center gap-2 text-sm text-default-600">
                <span>Submitted by:</span>
                <span className="font-medium">{user.name || user.email}</span>
              </div>
            )}
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
            entityId={request.entityId ?? undefined}
          />
        </CardBody>

        {/* Admin Actions */}
        {isPending && (
          <CardFooter className="border-t border-default px-6 py-4">
            <div className="flex justify-end gap-3">
              <Button
                color="danger"
                variant="flat"
                onPress={onRejectModalOpen}
                startContent={<X className="h-4 w-4" />}
                isDisabled={rejectRequestMutation.isPending}
              >
                Reject
              </Button>
              <Button
                color="success"
                onPress={onApproveModalOpen}
                startContent={<Check className="h-4 w-4" />}
                isDisabled={approveRequestMutation.isPending}
              >
                Approve
              </Button>
            </div>
          </CardFooter>
        )}

        {/* Status Message for Non-Pending Requests */}
        {!isPending && (
          <CardFooter className="border-t border-default px-6 py-4">
            <div className="flex items-center gap-2 text-sm">
              {isApproved && (
                <>
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-success">This request has already been approved</span>
                </>
              )}
              {isRejected && (
                <>
                  <X className="h-4 w-4 text-danger" />
                  <span className="text-danger">This request has already been rejected</span>
                </>
              )}
            </div>
          </CardFooter>
        )}
      </CustomCard>

      {/* Approve Confirmation Modal */}
      <Modal isOpen={isApproveModalOpen} onClose={onApproveModalClose}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              Approve Request
            </div>
          </ModalHeader>
          <ModalBody>
            <p>Are you sure you want to approve this request?</p>
            <div className="rounded-lg bg-success-50 p-3 text-sm text-success-700">
              This action will apply the changes to the dictionary and cannot be undone.
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="flat"
              onPress={onApproveModalClose}
              isDisabled={approveRequestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              color="success"
              onPress={handleApprove}
              isLoading={approveRequestMutation.isPending}
              startContent={!approveRequestMutation.isPending ? <Check className="h-4 w-4" /> : undefined}
            >
              Confirm Approval
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reject Confirmation Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={onRejectModalClose}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-danger" />
              Reject Request
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="mb-4">Are you sure you want to reject this request?</p>
            <Textarea
              label="Rejection Reason"
              placeholder="Enter the reason for rejection (optional)..."
              value={rejectReason}
              onValueChange={setRejectReason}
              minRows={3}
              maxRows={6}
              description="Providing a reason helps contributors understand why their request was rejected."
            />
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="flat"
              onPress={onRejectModalClose}
              isDisabled={rejectRequestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={handleReject}
              isLoading={rejectRequestMutation.isPending}
              startContent={!rejectRequestMutation.isPending ? <X className="h-4 w-4" /> : undefined}
            >
              Confirm Rejection
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
