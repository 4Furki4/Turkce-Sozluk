"use client";

import { useRef, useState } from "react";
import { Button, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { toast } from "sonner";
import { CustomModal } from "@/src/components/customs/heroui/custom-modal";
import { api } from "@/src/trpc/react";
import { requestErrorKey } from "@/src/lib/request-presentation";

export function CancelRequestButton({ requestId, compact = false, onCancelled }: {
  requestId: number;
  compact?: boolean;
  onCancelled?: () => void;
}) {
  const t = useTranslations("Requests");
  const tModal = useTranslations("RequestDetails.modals.cancel");
  const tErrors = useTranslations("Errors");
  const { executeRecaptcha } = useGoogleReCaptcha();
  const mutation = api.request.cancelRequest.useMutation();
  const utils = api.useUtils();
  const [isOpen, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  async function confirm() {
    // Lock before CAPTCHA too: mutation.isPending alone leaves a double-submit window.
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!executeRecaptcha) { setError(tErrors("captchaError")); return; }
      let captchaToken: string;
      try { captchaToken = await executeRecaptcha("cancel_request"); }
      catch { setError(tErrors("captchaFailed")); return; }
      await mutation.mutateAsync({ requestId, captchaToken });
      setOpen(false);
      toast.success(t("messages.cancelled"));
      // A failed refresh must not turn a successful cancellation into a failed action.
      await Promise.allSettled([utils.request.getUserRequests.invalidate()]);
      onCancelled?.();
    } catch (cause) {
      const code = (cause as { data?: { code?: string } })?.data?.code;
      setError(t(code === "NOT_FOUND" ? "messages.cancelUnavailable" : code === "FORBIDDEN" ? "messages.cancelCaptchaFailed" : requestErrorKey(code, "messages.cancelFailed")));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <>
    <Button color="danger" variant={compact ? "light" : "flat"} size={compact ? "sm" : "md"}
      className="min-h-11 shrink-0" aria-label={t("buttons.cancelSpecific", { id: requestId })}
      onPress={() => { setError(null); setOpen(true); }}>
      {t(compact ? "buttons.cancel" : "buttons.cancelRequest")}
    </Button>
    <CustomModal isOpen={isOpen} onClose={() => { if (!submitting.current) setOpen(false); }}
      isDismissable={!busy} isKeyboardDismissDisabled={busy} hideCloseButton={busy}>
      <ModalContent>
        <ModalHeader>{tModal("title")}</ModalHeader>
        <ModalBody>
          <p>{tModal("description")}</p>
          {error && <p role="alert" className="text-danger-700 dark:text-danger-300">{error}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" isDisabled={busy} className="min-h-11" onPress={() => setOpen(false)}>{tModal("cancel")}</Button>
          <Button color="danger" isLoading={busy} isDisabled={busy} className="min-h-11" onPress={confirm}>{tModal("confirm")}</Button>
        </ModalFooter>
      </ModalContent>
    </CustomModal>
  </>;
}
