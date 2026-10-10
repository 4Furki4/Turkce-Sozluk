"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { CustomModal } from "./customs/heroui/custom-modal";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallAppControl() {
  const t = useTranslations("Home.hero.pwaFeature");
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as InstallPromptEvent;
    };
    const handleInstalled = () => { promptRef.current = null; setInstalled(true); };
    updateInstalled();
    standalone.addEventListener("change", updateInstalled);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      standalone.removeEventListener("change", updateInstalled);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    const prompt = promptRef.current;
    if (!prompt) { onOpen(); return; }
    setIsPrompting(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch {
      onOpen();
    } finally {
      promptRef.current = null;
      setIsPrompting(false);
    }
  };

  return <>
    <Button variant="light" color="primary" className="min-h-11 justify-start px-0 font-semibold" onPress={install} isLoading={isPrompting} isDisabled={installed} startContent={<Download className="h-4 w-4" aria-hidden />}>
      {installed ? t("installed") : t("action")}
    </Button>
    <CustomModal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>{(onClose) => <>
        <ModalHeader>{t("instructionsTitle")}</ModalHeader>
        <ModalBody className="space-y-3">
          <p>{t("instructionsBrowser")}</p>
          <p>{t("instructionsSafari")}</p>
          <p className="text-sm text-muted-foreground">{t("instructionsUnavailable")}</p>
        </ModalBody>
        <ModalFooter><Button onPress={onClose} color="primary">{t("close")}</Button></ModalFooter>
      </>}</ModalContent>
    </CustomModal>
  </>;
}
