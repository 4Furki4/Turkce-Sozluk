import { env } from "@/src/env.mjs";
import { isEtymologyWordPilotEnabled } from "@/src/server/etymology/pilot-access";

export function getEtymologyPilotScanDirectory() {
  return isEtymologyWordPilotEnabled() ? env.ETYMOLOGY_OCR_DIR : undefined;
}
