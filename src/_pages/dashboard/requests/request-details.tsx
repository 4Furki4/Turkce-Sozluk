"use client"
import { api } from "@/src/trpc/react";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Spinner,
  Divider,
  Button,
  Chip,
  User,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Check, X } from "lucide-react";
import { toast } from "sonner";
import { EntityTypes, Actions } from "@/db/schema/requests";
import { Link } from "@/src/i18n/routing";

const entityTypeLabels: Record<EntityTypes, string> = {
  words: "Words",
  meanings: "Meanings",
  roots: "Roots",
  related_words: "Related Words",
  part_of_speechs: "Parts of Speech",
  examples: "Examples",
  authors: "Authors",
  word_attributes: "Word Attributes",
  meaning_attributes: "Meaning Attributes",
  related_phrases: "Related Phrases",
  pronunciations: "Pronunciations",
  misspellings: "Misspellings",
  galatimeshur: "Galatimeshur",
};

const actionLabels: Record<Actions, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
};

const actionColors: Record<Actions, "primary" | "warning" | "danger"> = {
  create: "primary",
  update: "warning",
  delete: "danger",
};

export function RequestDetails({ requestId }: { requestId: number }) {
  const router = useRouter();
  const [rejectReason, setRejectReason] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { data, isLoading, isError } = api.request.getRequestDetails.useQuery({
    requestId,
  });

  const approveRequestMutation = api.request.approveRequest.useMutation({
    onSuccess: () => {
      toast.success("Request approved successfully");
      router.push("/dashboard/requests");
    },
    onError: (error) => {
      toast.error(`Error approving request: ${error.message}`);
    },
  });

  const rejectRequestMutation = api.request.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success("Request rejected successfully");
      router.push("/dashboard/requests");
    },
    onError: (error) => {
      toast.error(`Error rejecting request: ${error.message}`);
    },
  });

  const handleApprove = () => {
    approveRequestMutation.mutate({ requestId });
  };

  const handleReject = () => {
    rejectRequestMutation.mutate({
      requestId,
      reason: rejectReason,
    });
    onClose();
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <p className="text-danger">Error loading request details. Please try again.</p>
      </div>
    );
  }

  const { request, user, entityData } = data;

  // Format the newData for display
  const formatData = (data: any): string => {
    if (!data) return "No data";

    if (typeof data === "string") {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        return data;
      }
    }

    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="container mx-auto py-8">
      <Link href={"/dashboard/requests"}>
        <span className="flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back to Requests
        </span>
      </Link>

      <h1 className="mb-6 text-2xl font-bold">Request Details</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Request Information</h2>
            <div className="flex flex-wrap gap-2">
              <Chip color={actionColors[request.action]}>
                {actionLabels[request.action]}
              </Chip>
              <Chip variant="flat" color="secondary">
                {entityTypeLabels[request.entityType]}
              </Chip>
            </div>
          </CardHeader>

          <Divider />

          <CardBody className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-gray-500">Requester</p>
              <User
                name={user?.name || "Unknown User"}
                avatarProps={{ src: user?.image || undefined }}
                description={user?.email || request.userId}
              />
            </div>

            <div>
              <p className="text-sm text-gray-500">Request Date</p>
              <p>
                {request.requestDate
                  ? formatDistanceToNow(new Date(request.requestDate), {
                    addSuffix: true,
                  })
                  : "Unknown"}
              </p>
            </div>

            {request.reason && (
              <div>
                <p className="text-sm text-gray-500">Reason</p>
                <p className="whitespace-pre-wrap rounded-md bg-gray-100 p-2 dark:bg-gray-800">
                  {request.reason}
                </p>
              </div>
            )}

            {request.entityId && (
              <div>
                <p className="text-sm text-gray-500">Entity ID</p>
                <p>{request.entityId}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">
              {request.action === "create"
                ? "New Data"
                : request.action === "update"
                  ? "Changes"
                  : "Entity to Delete"}
            </h2>
          </CardHeader>

          <Divider />

          <CardBody>
            {request.action === "update" && entityData && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium text-gray-500">Current Data:</p>
                <pre className="max-h-40 overflow-auto rounded-md bg-gray-100 p-3 text-sm dark:bg-gray-800">
                  {formatData(entityData as Record<string, unknown>)}
                </pre>
              </div>
            )}

            {request.newData as Record<string, unknown> && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-500">
                  {request.action === "update" ? "New Data:" : "Data:"}
                </p>
                <pre className="max-h-60 overflow-auto rounded-md bg-gray-100 p-3 text-sm dark:bg-gray-800">
                  {formatData(request.newData)}
                </pre>
              </div>
            )}

            {!request.newData && request.action === "delete" && entityData && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-500">Data to Delete:</p>
                <pre className="max-h-60 overflow-auto rounded-md bg-gray-100 p-3 text-sm dark:bg-gray-800">
                  {formatData(entityData as Record<string, unknown>)}
                </pre>
              </div>
            )}
          </CardBody>

          <Divider />

          <CardFooter className="flex justify-between">
            <Button
              color="danger"
              variant="light"
              startContent={<X size={16} />}
              onPress={onOpen}
              isLoading={rejectRequestMutation.isPending}
            >
              Reject
            </Button>
            <Button
              color="primary"
              startContent={<Check size={16} />}
              onPress={handleApprove}
              isLoading={approveRequestMutation.isPending}
            >
              Approve
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Reject Request</ModalHeader>
          <ModalBody>
            <p className="mb-4">Are you sure you want to reject this request?</p>
            <Textarea
              label="Reason for rejection (optional)"
              placeholder="Enter reason for rejection"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
            <Button color="danger" onPress={handleReject}>
              Reject
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
