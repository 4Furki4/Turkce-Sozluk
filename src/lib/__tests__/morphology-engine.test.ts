import { TurkishMorphologyEngine } from "../morphology";

describe("TurkishMorphologyEngine", () => {
  const engine = new TurkishMorphologyEngine();

  it("applies consonant mutation for vowel-initial noun inflection", () => {
    const result = engine.buildWord(
      {
        surface: "kitap",
        pos: "Noun",
      },
      ["noun.inflection.accusative"],
    );

    expect(result.finalSurface).toBe("kitabı");
    expect(result.steps[0]?.log.explanationArray).toContain(
      "Ünsüz yumuşaması uygulandı: p -> b.",
    );
    expect(result.steps[0]?.log.diff.afterHighlighted).toBe("kita[bı]");
  });

  it("inserts a buffer letter when a vowel-final stem meets a vowel-initial suffix", () => {
    const result = engine.buildWord(
      {
        surface: "aile",
        pos: "Noun",
      },
      ["noun.inflection.accusative"],
    );

    expect(result.finalSurface).toBe("aileyi");
    expect(result.steps[0]?.log.explanationArray).toContain(
      "Tampon harf eklendi: y.",
    );
  });

  it("applies consonant assimilation on hard-final stems", () => {
    const result = engine.buildWord(
      {
        surface: "kitap",
        pos: "Noun",
      },
      ["noun.deriv.CI"],
    );

    expect(result.finalSurface).toBe("kitapçı");
    expect(result.steps[0]?.log.explanationArray).toContain(
      "Ünsüz sertleşmesi uygulandı: C -> ç.",
    );
  });

  it("updates part of speech and filters available suffixes after derivation", () => {
    const result = engine.buildWord(
      {
        surface: "kitap",
        pos: "Noun",
      },
      ["noun.deriv.lAş"],
    );

    expect(result.finalSurface).toBe("kitaplaş");
    expect(result.finalPos).toBe("Verb");
    expect(result.availableSuffixes.every((suffix) => suffix.sourcePos === "Verb")).toBe(true);
    expect(result.steps[0]?.log.explanationArray).toContain(
      "Kelime türü güncellendi: Noun -> Verb.",
    );
  });

  it("locks the state into inflection phase after the first inflectional suffix", () => {
    const result = engine.buildWord(
      {
        surface: "ev",
        pos: "Noun",
      },
      ["noun.inflection.lAr"],
    );

    expect(result.finalSurface).toBe("evler");
    expect(result.finalState.phase).toBe("inflection");
    expect(result.availableSuffixes.every((suffix) => suffix.kind === "inflectional")).toBe(true);
  });

  it("skips consonant mutation for foreign roots by default", () => {
    const result = engine.buildWord(
      {
        surface: "link",
        pos: "Noun",
        origin: "foreign",
      },
      ["noun.inflection.accusative"],
    );

    expect(result.finalSurface).toBe("linki");
    expect(
      result.steps[0]?.log.explanationArray.some((message) =>
        message.includes("Ünsüz yumuşaması"),
      ),
    ).toBe(false);
  });

  it("supports chained derivation plus inflection with full step logs", () => {
    const result = engine.buildWord(
      {
        surface: "yurt",
        pos: "Noun",
      },
      ["noun.deriv.DAş", "noun.inflection.accusative"],
    );

    expect(result.finalSurface).toBe("yurttaşı");
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]?.log.afterSurface).toBe("yurttaş");
    expect(result.steps[1]?.log.beforeSurface).toBe("yurttaş");
  });
});
