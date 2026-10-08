import { isApprovedRecording, pronunciationReviewFlags } from "../pronunciation-review";

describe("pronunciation review", () => {
  it("flags lost circumflexes without changing headwords", () => {
    expect(pronunciationReviewFlags("kâr", 0.4, "kar")).toEqual(["circumflex", "lostCircumflex"]);
    expect(pronunciationReviewFlags("kar", 0.4, "kar")).toEqual([]);
  });
  it("flags single and very short words", () => {
    expect(pronunciationReviewFlags("o")).toEqual(["singleCharacter"]);
    expect(pronunciationReviewFlags("su")).toEqual(["veryShort"]);
    expect(pronunciationReviewFlags("İ")).toEqual(["singleCharacter"]);
  });
  it("only approves the exact reviewed recording", () => {
    expect(isApprovedRecording("approved", "old", "new")).toBe(false);
    expect(isApprovedRecording("approved", "same", "same")).toBe(true);
    for (const decision of ["unreviewed", "rejected", "deferred", undefined]) expect(isApprovedRecording(decision, "same", "same")).toBe(false);
  });
});
