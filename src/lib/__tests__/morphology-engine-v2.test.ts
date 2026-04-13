import {
  createLexemeEntryFromRoot,
  TurkishMorphologyEngine,
} from "../morphology";

describe("TurkishMorphologyEngine V2 core", () => {
  const engine = new TurkishMorphologyEngine();

  it("offers noun actions across optional slots from the initial state", () => {
    const state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );
    const actions = engine.getAvailableActions(state);

    expect(actions.some((action) => action.slot === "noun_number")).toBe(true);
    expect(actions.some((action) => action.slot === "noun_possessive")).toBe(true);
    expect(actions.some((action) => action.slot === "noun_case")).toBe(true);
    expect(actions.some((action) => action.kind === "derivational")).toBe(true);
    expect(state.currentCategory).toBe("Noun");
    expect(state.continuation.allowDerivation).toBe(true);
    expect(state.continuation.allowNominalInflection).toBe(true);
  });

  it("closes earlier noun slots after choosing a later slot", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    state = engine.applyAction(state, "noun.case.loc");

    expect(engine.getAvailableActions(state)).toHaveLength(0);
    expect(engine.realize(state).surface).toBe("evde");
  });

  it("does not expose verb agreement before a TAM choice is made", () => {
    const state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "yaz",
        pos: "Verb",
      }),
    );
    const actions = engine.getAvailableActions(state);

    expect(actions.some((action) => action.slot === "verb_polarity")).toBe(true);
    expect(actions.some((action) => action.slot === "verb_tam")).toBe(true);
    expect(actions.some((action) => action.slot === "verb_agreement")).toBe(false);
    expect(state.currentCategory).toBe("Verb");
    expect(state.continuation.allowAnalyticConstructions).toBe(true);
    expect(state.continuation.allowFiniteVerbInflection).toBe(true);
  });

  it("builds a negative progressive first-person singular verb chain", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "yap",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.polarity.neg");
    state = engine.applyAction(state, "verb.tam.prog");
    state = engine.applyAction(state, "verb.agreement.1sg");

    const realization = engine.realize(state);

    expect(realization.surface).toBe("yapmıyorum");
    expect(state.history[1]?.log.events.some((event) => event.code === "progressive_vowel_drop")).toBe(
      true,
    );
  });

  it("uses lexical allomorph overrides for irregular aorist verbs", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gör",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.tam.aor");

    const realization = engine.realize(state);

    expect(realization.surface).toBe("görür");
    expect(state.history[0]?.log.events.some((event) => event.code === "lexeme_override_applied")).toBe(
      true,
    );
  });

  it("does not insert pronominal n after first-person possessive before accusative", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "aile",
        pos: "Noun",
      }),
    );

    state = engine.applyAction(state, "noun.possessive.p1sg");
    state = engine.applyAction(state, "noun.case.acc");

    expect(engine.realize(state).surface).toBe("ailemi");
  });

  it("does not insert pronominal n after first-person possessive before dative or ablative", () => {
    let dativeState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "aile",
        pos: "Noun",
      }),
    );

    dativeState = engine.applyAction(dativeState, "noun.possessive.p1sg");
    dativeState = engine.applyAction(dativeState, "noun.case.dat");
    expect(engine.realize(dativeState).surface).toBe("aileme");

    let ablativeState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "aile",
        pos: "Noun",
      }),
    );

    ablativeState = engine.applyAction(ablativeState, "noun.possessive.p1sg");
    ablativeState = engine.applyAction(ablativeState, "noun.case.abl");
    expect(engine.realize(ablativeState).surface).toBe("ailemden");
  });

  it("keeps pronominal n after third-person possessive before accusative", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    state = engine.applyAction(state, "noun.possessive.p3sg");
    state = engine.applyAction(state, "noun.case.acc");

    expect(engine.realize(state).surface).toBe("evini");
  });

  it("supports noun-to-verb derivation and keeps derivation open until inflection starts", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "kitap",
        pos: "Noun",
      }),
    );

    state = engine.applyAction(state, "noun.deriv.lAş");

    expect(state.currentPos).toBe("Verb");
    expect(state.currentCategory).toBe("Verb");
    expect(state.phase).toBe("derivation");
    expect(state.continuation.allowDerivation).toBe(true);
    expect(state.continuation.allowFiniteVerbInflection).toBe(true);
    expect(engine.realize(state).surface).toBe("kitaplaş");
    expect(
      engine.getAvailableActions(state).some((action) => action.id === "verb.tam.past"),
    ).toBe(true);
    expect(
      state.history[0]?.log.events.some((event) => event.code === "derivation_applied"),
    ).toBe(true);
  });

  it("allows multiple derivations before inflection and resets features on POS change", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "kitap",
        pos: "Noun",
      }),
    );

    state = engine.applyAction(state, "noun.deriv.lAş");
    state = engine.applyAction(state, "verb.deriv.mA");

    expect(state.currentPos).toBe("Noun");
    expect(state.currentCategory).toBe("Noun");
    expect(state.phase).toBe("derivation");
    expect(state.features.case).toBe("nom");
    expect(state.continuation.allowNominalInflection).toBe(true);
    expect(engine.realize(state).surface).toBe("kitaplaşma");
    expect(
      engine.getAvailableActions(state).some((action) => action.id === "noun.case.loc"),
    ).toBe(true);
  });

  it("closes derivation after the first inflectional morpheme", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "kitap",
        pos: "Noun",
      }),
    );

    state = engine.applyAction(state, "noun.deriv.lAş");
    state = engine.applyAction(state, "verb.tam.past");

    expect(state.phase).toBe("inflection");
    expect(state.currentCategory).toBe("Verb");
    expect(state.continuation.allowDerivation).toBe(false);
    expect(state.continuation.allowAnalyticConstructions).toBe(false);
    expect(
      engine.getAvailableActions(state).some((action) => action.kind === "derivational"),
    ).toBe(false);
    expect(engine.realize(state).surface).toBe("kitaplaştı");
  });

  it("supports verb-to-noun derivation with existing catalog morphemes", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "eğ",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.deriv.Im");

    expect(state.currentPos).toBe("Noun");
    expect(state.currentCategory).toBe("Noun");
    expect(engine.realize(state).surface).toBe("eğim");
    expect(
      engine.getAvailableActions(state).some((action) => action.id === "noun.case.acc"),
    ).toBe(true);
  });

  it("supports verbal noun forms and opens nominal inflection afterwards", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "yaz",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.nonfinite.verbalNoun.mA");

    expect(state.currentCategory).toBe("VerbalNoun");
    expect(state.currentPos).toBe("Noun");
    expect(state.phase).toBe("inflection");
    expect(state.continuation.allowNominalInflection).toBe(true);
    expect(state.continuation.allowDerivation).toBe(false);
    expect(engine.realize(state).surface).toBe("yazma");
    expect(
      engine.getAvailableActions(state).some((action) => action.id === "noun.case.loc"),
    ).toBe(true);
  });

  it("supports participle forms and keeps them on the nominal side", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.nonfinite.participle.An");

    expect(state.currentCategory).toBe("Participle");
    expect(state.currentPos).toBe("Noun");
    expect(state.continuation.allowNominalInflection).toBe(true);
    expect(state.continuation.allowFiniteVerbInflection).toBe(false);
    expect(engine.realize(state).surface).toBe("gelen");
  });

  it("supports converb forms and closes the chain afterwards", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "bak",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.nonfinite.converb.Ip");

    expect(state.currentCategory).toBe("Converb");
    expect(state.currentPos).toBe("Verb");
    expect(state.phase).toBe("inflection");
    expect(state.continuation.allowInflection).toBe(false);
    expect(state.continuation.allowNonfinite).toBe(false);
    expect(engine.realize(state).surface).toBe("bakıp");
    expect(engine.getAvailableActions(state)).toHaveLength(0);
  });
});
