import { env } from "@/src/env.mjs";
import { isEtymologyReviewEnabled } from "@/src/server/etymology/pilot-access";

export function getEtymologyPilotScanDirectory() {
  return isEtymologyReviewEnabled() ? env.ETYMOLOGY_OCR_DIR : undefined;
}
