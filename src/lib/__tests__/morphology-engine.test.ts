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
    expect(result.steps[0]?.log.events.some((event) => event.code === "consonant_mutation")).toBe(
      true,
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
    expect(result.steps[0]?.log.events.some((event) => event.code === "buffer_letter")).toBe(
      true,
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
    expect(result.steps[0]?.log.events.some((event) => event.code === "consonant_assimilation")).toBe(
      true,
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
    expect(result.steps[0]?.log.events.some((event) => event.code === "pos_change")).toBe(
      true,
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
      result.steps[0]?.log.events.some((event) => event.code === "consonant_mutation"),
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

  it("supports noun possessive plus genitive through the adapter", () => {
    const result = engine.buildWord(
      {
        surface: "kitap",
        pos: "Noun",
      },
      ["noun.inflection.possessive1sg", "noun.inflection.genitive"],
    );

    expect(result.finalSurface).toBe("kitabımın");
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]?.action?.id).toBe("noun.possessive.p1sg");
  });

  it("keeps first-person possessive case forms without extra n in the adapter", () => {
    const accusative = engine.buildWord(
      {
        surface: "aile",
        pos: "Noun",
      },
      ["noun.inflection.possessive1sg", "noun.inflection.accusative"],
    );
    const dative = engine.buildWord(
      {
        surface: "aile",
        pos: "Noun",
      },
      ["noun.inflection.possessive1sg", "noun.inflection.dative"],
    );
    const ablative = engine.buildWord(
      {
        surface: "aile",
        pos: "Noun",
      },
      ["noun.inflection.possessive1sg", "noun.inflection.ablative"],
    );

    expect(accusative.finalSurface).toBe("ailemi");
    expect(dative.finalSurface).toBe("aileme");
    expect(ablative.finalSurface).toBe("ailemden");
  });

  it("keeps pronominal n after third-person possessive in the adapter", () => {
    const result = engine.buildWord(
      {
        surface: "ev",
        pos: "Noun",
      },
      ["noun.inflection.possessive3sg", "noun.inflection.accusative"],
    );

    expect(result.finalSurface).toBe("evini");
  });

  it("supports future tense verb agreement through the adapter", () => {
    const result = engine.buildWord(
      {
        surface: "gör",
        pos: "Verb",
      },
      ["verb.inflection.future", "verb.inflection.1sg"],
    );

    expect(result.finalSurface).toBe("göreceğim");
    expect(result.steps[1]?.log.events.some((event) => event.code === "consonant_mutation")).toBe(
      true,
    );
  });

  it("supports derivation followed by verb inflection through the adapter", () => {
    const result = engine.buildWord(
      {
        surface: "kitap",
        pos: "Noun",
      },
      ["noun.deriv.lAş", "verb.inflection.past", "verb.inflection.1sg"],
    );

    expect(result.finalSurface).toBe("kitaplaştım");
    expect(result.finalPos).toBe("Verb");
    expect(result.steps[0]?.log.events.some((event) => event.code === "pos_change")).toBe(
      true,
    );
  });

  it("supports multiple derivations before noun inflection through the adapter", () => {
    const result = engine.buildWord(
      {
        surface: "kitap",
        pos: "Noun",
      },
      ["noun.deriv.lAş", "verb.deriv.mA", "noun.inflection.locative"],
    );

    expect(result.finalSurface).toBe("kitaplaşmada");
    expect(result.finalPos).toBe("Noun");
  });
});
