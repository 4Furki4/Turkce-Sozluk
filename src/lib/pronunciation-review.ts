export const reviewDecisions = ["approved", "rejected", "deferred", "unreviewed"] as const;
export type ReviewDecision = typeof reviewDecisions[number];

export function pronunciationReviewFlags(text: string, duration?: number, frontendText?: string) {
  const flags: string[] = [];
  if (/[âîûÂÎÛ]/u.test(text)) flags.push("circumflex");
  if ([...text.trim()].length === 1) flags.push("singleCharacter");
  else if ([...text.trim()].length <= 2) flags.push("veryShort");
  if (duration !== undefined && duration < 0.25) flags.push("shortAudio");
  if (duration !== undefined && duration > 10) flags.push("longAudio");
  if (frontendText !== undefined && /[âîûÂÎÛ]/u.test(text) && !/[âîûÂÎÛ]/u.test(frontendText)) flags.push("lostCircumflex");
  return flags;
}

export function isReviewDecision(value: unknown): value is ReviewDecision {
  return typeof value === "string" && (reviewDecisions as readonly string[]).includes(value);
}

export function isApprovedRecording(decision: string | undefined, reviewedChecksum: string | undefined, currentChecksum: string) {
  return decision === "approved" && reviewedChecksum === currentChecksum;
}
