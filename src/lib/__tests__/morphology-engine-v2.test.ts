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

  it("keeps adjectives as a separate lexical category while reusing the nominal predicative path", () => {
    const state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "güzel",
        pos: "Noun",
        category: "Adjective",
      }),
    );

    const actions = engine.getAvailableActions(state);

    expect(state.currentPos).toBe("Noun");
    expect(state.currentCategory).toBe("Adjective");
    expect(state.continuation.allowNominalInflection).toBe(false);
    expect(actions.some((action) => action.id === "noun.case.loc")).toBe(false);
    expect(actions.some((action) => action.id === "predicative.agreement.1sg")).toBe(
      true,
    );
    expect(actions.some((action) => action.id === "postfinite.copula.imiş")).toBe(true);
  });

  it("closes earlier noun slots after choosing a later slot", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    state = engine.applyAction(state, "noun.case.loc");

    const actions = engine.getAvailableActions(state);

    expect(
      actions.every(
        (action) =>
          action.kind === "postfinite" ||
          action.id.startsWith("predicative."),
      ),
    ).toBe(true);
    expect(actions.some((action) => action.id === "predicative.agreement.1sg")).toBe(
      true,
    );
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
    expect(actions.some((action) => action.kind === "postfinite")).toBe(false);
  });

  it("offers analytic constructions from the initial verb state", () => {
    const state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "yap",
        pos: "Verb",
      }),
    );

    const actions = engine.getAvailableActions(state);

    expect(
      actions.some((action) => action.id === "verb.analytic.ability.ebil"),
    ).toBe(true);
    expect(
      actions.some((action) => action.id === "verb.analytic.celerity.iver"),
    ).toBe(true);
    expect(
      actions.some((action) => action.id === "verb.analytic.continuative.adur"),
    ).toBe(true);
    expect(
      actions.some((action) => action.id === "verb.analytic.persistence.akal"),
    ).toBe(true);
    expect(
      actions.some((action) => action.id === "verb.analytic.progression.agel"),
    ).toBe(true);
    expect(
      actions.some((action) => action.id === "verb.analytic.approximative.ayaz"),
    ).toBe(true);
    expect(
      actions.some((action) => action.id === "verb.analytic.serial.ipDur"),
    ).toBe(true);
    expect(
      actions.some((action) => action.id === "verb.analytic.serial.ipGit"),
    ).toBe(true);
    expect(
      actions.some((action) => action.id === "verb.analytic.serial.ipKal"),
    ).toBe(true);
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

  it("uses curated lexical aorist overrides for other high-frequency irregular verbs", () => {
    let alState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "al",
        pos: "Verb",
      }),
    );

    alState = engine.applyAction(alState, "verb.tam.aor");
    expect(engine.realize(alState).surface).toBe("alır");

    let olState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ol",
        pos: "Verb",
      }),
    );

    olState = engine.applyAction(olState, "verb.tam.aor");
    expect(engine.realize(olState).surface).toBe("olur");
  });

  it("handles lexical verb softening for git before vowel-initial derivational and nonfinite forms", () => {
    let derivationState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "git",
        pos: "Verb",
      }),
    );

    derivationState = engine.applyAction(derivationState, "verb.deriv.Iş");

    expect(engine.realize(derivationState).surface).toBe("gidiş");
    expect(
      derivationState.history[0]?.log.events.some(
        (event) => event.code === "consonant_mutation",
      ),
    ).toBe(true);

    let converbState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "git",
        pos: "Verb",
      }),
    );

    converbState = engine.applyAction(converbState, "verb.nonfinite.converb.IncA");

    expect(engine.realize(converbState).surface).toBe("gidince");
  });

  it("handles lexical verb softening for et before vowel-initial converb forms", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "et",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.nonfinite.converb.Ip");

    expect(engine.realize(state).surface).toBe("edip");
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

  it("inserts buffer y before agentive -ICI on vowel-final verbal stems", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "güzel",
        pos: "Noun",
        category: "Adjective",
      }),
    );

    state = engine.applyAction(state, "adjective.deriv.lIk");
    state = engine.applyAction(state, "noun.deriv.lA");
    state = engine.applyAction(state, "verb.deriv.ICI");

    expect(engine.realize(state).surface).toBe("güzellikleyici");
  });

  it("does not expose the same derivational morpheme twice in a row", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "kitap",
        pos: "Noun",
      }),
    );

    state = engine.applyAction(state, "noun.deriv.lIk");

    expect(engine.realize(state).surface).toBe("kitaplık");
    expect(
      engine.getAvailableActions(state).some((action) => action.id === "noun.deriv.lIk"),
    ).toBe(false);
    expect(
      engine.getAvailableActions(state).some((action) => action.id === "noun.deriv.lI"),
    ).toBe(true);
  });

  it("does not expose the same derivation family twice in one chain", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "güzel",
        pos: "Noun",
        category: "Adjective",
      }),
    );

    state = engine.applyAction(state, "adjective.deriv.lIk");

    const actions = engine.getAvailableActions(state);

    expect(actions.some((action) => action.id === "noun.deriv.lIk")).toBe(false);
    expect(actions.some((action) => action.id === "noun.deriv.lI")).toBe(true);
  });

  it("ranks more natural noun derivations before marginal ones", () => {
    const state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "kitap",
        pos: "Noun",
      }),
    );

    const derivationIds = engine
      .getAvailableActions(state)
      .filter((action) => action.kind === "derivational")
      .map((action) => action.id);

    expect(derivationIds.indexOf("noun.deriv.lIk")).toBeLessThan(
      derivationIds.indexOf("noun.deriv.sA"),
    );
    expect(derivationIds.indexOf("noun.deriv.lIk")).toBeLessThan(
      derivationIds.indexOf("noun.deriv.DAş"),
    );
  });

  it("ranks common post-finite overlays before marked ones", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.tam.prog");

    const postfiniteIds = engine
      .getAvailableActions(state)
      .filter((action) => action.kind === "postfinite")
      .map((action) => action.id);

    expect(postfiniteIds.indexOf("postfinite.question.mI")).toBeLessThan(
      postfiniteIds.indexOf("postfinite.while.iken"),
    );
    expect(postfiniteIds.indexOf("postfinite.copula.idi")).toBeLessThan(
      postfiniteIds.indexOf("postfinite.while.iken"),
    );
  });

  it("respects lexeme-level blocked morphemes and groups", () => {
    const state = engine.initializeState({
      ...createLexemeEntryFromRoot({
        surface: "kitap",
        pos: "Noun",
      }),
      blockedMorphemeIds: ["noun.deriv.lIk"],
      blockedGroups: ["NounToVerb"],
    });

    const actions = engine.getAvailableActions(state);

    expect(actions.some((action) => action.id === "noun.deriv.lIk")).toBe(false);
    expect(actions.some((action) => action.id === "noun.deriv.lA")).toBe(false);
    expect(actions.some((action) => action.id === "noun.deriv.lI")).toBe(true);
  });

  it("keeps passive, reflexive, and reciprocal voice morphemes mutually exclusive", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "yaz",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.voice.Il");

    const actions = engine.getAvailableActions(state);

    expect(actions.some((action) => action.id === "verb.voice.In")).toBe(false);
    expect(actions.some((action) => action.id === "verb.voice.Iş")).toBe(false);
    expect(actions.some((action) => action.id === "verb.voice.DIr")).toBe(true);
  });

  it("treats reflexive and reciprocal as root-level voice steps but still allows causative after them", () => {
    let reflexiveState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "giy",
        pos: "Verb",
      }),
    );

    reflexiveState = engine.applyAction(reflexiveState, "verb.voice.In");

    let actions = engine.getAvailableActions(reflexiveState);

    expect(actions.some((action) => action.id === "verb.voice.DIr")).toBe(true);
    expect(actions.some((action) => action.id === "verb.voice.Iş")).toBe(false);

    let causativeState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gör",
        pos: "Verb",
      }),
    );

    causativeState = engine.applyAction(causativeState, "verb.voice.DIr");

    actions = engine.getAvailableActions(causativeState);

    expect(actions.some((action) => action.id === "verb.voice.In")).toBe(false);
    expect(actions.some((action) => action.id === "verb.voice.Iş")).toBe(false);
    expect(actions.some((action) => action.id === "verb.voice.Il")).toBe(true);
  });

  it("closes voice derivation after an analytic construction has been selected", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "yap",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.analytic.ability.ebil");

    const actions = engine.getAvailableActions(state);

    expect(actions.some((action) => action.id.startsWith("verb.voice."))).toBe(false);
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

  it("supports ability analytic constructions before nonfinite forms", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "yap",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.analytic.ability.ebil");
    state = engine.applyAction(state, "verb.nonfinite.verbalNoun.mAk");

    expect(state.currentCategory).toBe("VerbalNoun");
    expect(state.currentPos).toBe("Noun");
    expect(engine.realize(state).surface).toBe("yapabilmek");
    expect(
      state.history[0]?.log.events.some((event) => event.code === "analytic_applied"),
    ).toBe(true);
  });

  it("supports celerity analytic constructions before finite inflection", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "bak",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.analytic.celerity.iver");
    state = engine.applyAction(state, "verb.tam.past");

    expect(state.currentCategory).toBe("Verb");
    expect(state.phase).toBe("inflection");
    expect(engine.realize(state).surface).toBe("bakıverdi");
  });

  it("supports continuative analytic constructions before verbal noun forms", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "yaz",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.analytic.continuative.adur");
    state = engine.applyAction(state, "verb.nonfinite.verbalNoun.mAk");

    expect(engine.realize(state).surface).toBe("yazadurmak");
  });

  it("supports persistence analytic constructions before verbal noun forms", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "bak",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.analytic.persistence.akal");
    state = engine.applyAction(state, "verb.nonfinite.verbalNoun.mAk");

    expect(engine.realize(state).surface).toBe("bakakalmak");
  });

  it("supports progression analytic constructions before verbal noun forms", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "sür",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.analytic.progression.agel");
    state = engine.applyAction(state, "verb.nonfinite.verbalNoun.mAk");

    expect(engine.realize(state).surface).toBe("süregelmek");
  });

  it("supports approximative analytic constructions before finite inflection", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "öl",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.analytic.approximative.ayaz");
    state = engine.applyAction(state, "verb.tam.past");

    expect(engine.realize(state).surface).toBe("öleyazdı");
  });

  it("supports serial converb-based analytic constructions with spaced auxiliaries", () => {
    let continuativeState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "bak",
        pos: "Verb",
      }),
    );

    continuativeState = engine.applyAction(
      continuativeState,
      "verb.analytic.serial.ipDur",
    );
    continuativeState = engine.applyAction(
      continuativeState,
      "verb.nonfinite.verbalNoun.mAk",
    );

    expect(engine.realize(continuativeState).surface).toBe("bakıp durmak");

    let progressiveState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gül",
        pos: "Verb",
      }),
    );

    progressiveState = engine.applyAction(
      progressiveState,
      "verb.analytic.serial.ipGit",
    );
    progressiveState = engine.applyAction(progressiveState, "verb.tam.past");

    expect(engine.realize(progressiveState).surface).toBe("gülüp gitti");

    let resultativeState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "don",
        pos: "Verb",
      }),
    );

    resultativeState = engine.applyAction(
      resultativeState,
      "verb.analytic.serial.ipKal",
    );
    resultativeState = engine.applyAction(resultativeState, "verb.tam.past");

    expect(engine.realize(resultativeState).surface).toBe("donup kaldı");
  });

  it("does not expose a second analytic construction after one has been selected", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "yap",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.analytic.ability.ebil");

    expect(
      engine.getAvailableActions(state).some((action) => action.kind === "analytic"),
    ).toBe(false);
  });

  it("supports negative finite chains after ability constructions", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "yap",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.analytic.ability.ebil");
    state = engine.applyAction(state, "verb.polarity.neg");
    state = engine.applyAction(state, "verb.tam.past");
    state = engine.applyAction(state, "verb.agreement.1pl");

    expect(engine.realize(state).surface).toBe("yapabilemedik");
  });

  it("keeps participle derivation available after ability plus negative and reaches user-facing long chains", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "güzel",
        pos: "Noun",
        category: "Adjective",
      }),
    );

    state = engine.applyAction(state, "adjective.deriv.lAş");
    state = engine.applyAction(state, "verb.voice.DIr");
    state = engine.applyAction(state, "verb.analytic.ability.ebil");
    state = engine.applyAction(state, "verb.polarity.neg");

    expect(engine.realize(state).surface).toBe("güzelleştirebileme");
    expect(
      engine
        .getAvailableActions(state)
        .some((action) => action.id === "verb.nonfinite.participle.DIK"),
    ).toBe(true);

    state = engine.applyAction(state, "verb.nonfinite.participle.DIK");
    state = engine.applyAction(state, "noun.number.pl");
    state = engine.applyAction(state, "noun.possessive.p1pl");

    expect(engine.realize(state).surface).toBe("güzelleştirebilemediklerimiz");
  });

  it("exposes post-finite overlays after finite verb inflection starts", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.tam.prog");

    const actions = engine.getAvailableActions(state);

    expect(actions.some((action) => action.id === "postfinite.question.mI")).toBe(true);
    expect(actions.some((action) => action.id === "postfinite.copula.idi")).toBe(true);
    expect(actions.some((action) => action.id === "postfinite.copula.imiş")).toBe(true);
    expect(actions.some((action) => action.id === "postfinite.conditional.ise")).toBe(true);
    expect(actions.some((action) => action.id === "postfinite.while.iken")).toBe(true);
  });

  it("supports question and copular post-finite overlays on finite verbs", () => {
    let questionState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    questionState = engine.applyAction(questionState, "verb.tam.prog");
    questionState = engine.applyAction(questionState, "postfinite.question.mI");

    expect(questionState.phase).toBe("postfinite");
    expect(engine.realize(questionState).surface).toBe("geliyor mu");
    expect(
      questionState.history[1]?.log.events.some(
        (event) => event.code === "postfinite_applied",
      ),
    ).toBe(true);

    let pastOverlayState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    pastOverlayState = engine.applyAction(pastOverlayState, "verb.tam.fut");
    pastOverlayState = engine.applyAction(pastOverlayState, "postfinite.copula.idi");

    expect(engine.realize(pastOverlayState).surface).toBe("gelecekti");
  });

  it("supports evidential, conditional, and while overlays", () => {
    let evidentialState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    evidentialState = engine.applyAction(evidentialState, "verb.tam.prog");
    evidentialState = engine.applyAction(evidentialState, "postfinite.copula.imiş");

    expect(engine.realize(evidentialState).surface).toBe("geliyormuş");

    let conditionalState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    conditionalState = engine.applyAction(conditionalState, "verb.tam.fut");
    conditionalState = engine.applyAction(conditionalState, "postfinite.conditional.ise");

    expect(engine.realize(conditionalState).surface).toBe("gelecekse");

    let whileState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    whileState = engine.applyAction(whileState, "noun.case.loc");
    whileState = engine.applyAction(whileState, "postfinite.while.iken");

    expect(engine.realize(whileState).surface).toBe("evdeyken");
  });

  it("supports direct conditional overlay on past finite verbs", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.tam.past");
    state = engine.applyAction(state, "postfinite.conditional.ise");

    expect(engine.realize(state).surface).toBe("geldiyse");
    expect(state.currentCategory).toBe("Verb");
  });

  it("supports nominal predicative overlays and promotes the category to Predicative", () => {
    let evidentialState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    evidentialState = engine.applyAction(evidentialState, "noun.case.loc");
    evidentialState = engine.applyAction(evidentialState, "postfinite.copula.imiş");

    expect(engine.realize(evidentialState).surface).toBe("evdeymiş");
    expect(evidentialState.currentCategory).toBe("Predicative");
    expect(
      evidentialState.tokens.some(
        (token) => token.kind !== "analytic" && token.kind !== "postfinite" && token.morphemeId === "predicative.zero.3sg",
      ),
    ).toBe(true);
    expect(
      evidentialState.history[1]?.log.events.some(
        (event) => event.code === "predicative_zero_applied",
      ),
    ).toBe(true);

    let questionPastState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    questionPastState = engine.applyAction(questionPastState, "postfinite.question.mI");
    questionPastState = engine.applyAction(
      questionPastState,
      "postfinite.copula.idi",
    );

    expect(engine.realize(questionPastState).surface).toBe("ev miydi");
    expect(questionPastState.currentCategory).toBe("Predicative");
  });

  it("supports predicative agreement on bare and case-marked nominal stems", () => {
    let bareState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    bareState = engine.applyAction(bareState, "predicative.agreement.1sg");

    expect(engine.realize(bareState).surface).toBe("evim");
    expect(bareState.currentCategory).toBe("Predicative");
    expect(
      bareState.tokens.some(
        (token) => token.kind !== "analytic" && token.kind !== "postfinite" && token.morphemeId === "predicative.zero.3sg",
      ),
    ).toBe(true);

    let locativeState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    locativeState = engine.applyAction(locativeState, "noun.case.loc");
    locativeState = engine.applyAction(locativeState, "predicative.agreement.1sg");

    expect(engine.realize(locativeState).surface).toBe("evdeyim");
    expect(locativeState.currentCategory).toBe("Predicative");
  });

  it("does not expose the implicit zero predicate as a selectable action and removes it on undo", () => {
    const initialState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    expect(
      engine.getAvailableActions(initialState).some((action) => action.id === "predicative.zero.3sg"),
    ).toBe(false);

    const predicatedState = engine.applyAction(
      initialState,
      "postfinite.copula.imiş",
    );

    expect(predicatedState.tokens).toHaveLength(2);

    const undoneState = engine.undoAction(predicatedState);

    expect(undoneState.tokens).toHaveLength(0);
    expect(undoneState.currentCategory).toBe("Noun");
  });

  it("supports predicative agreement after copular overlays", () => {
    let pastState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    pastState = engine.applyAction(pastState, "postfinite.copula.idi");
    pastState = engine.applyAction(pastState, "predicative.agreement.1sg");

    expect(engine.realize(pastState).surface).toBe("evdim");

    let evidentialState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    evidentialState = engine.applyAction(evidentialState, "postfinite.copula.imiş");
    evidentialState = engine.applyAction(evidentialState, "predicative.agreement.1sg");

    expect(engine.realize(evidentialState).surface).toBe("evmişim");

    let questionedState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    questionedState = engine.applyAction(questionedState, "postfinite.question.mI");
    questionedState = engine.applyAction(
      questionedState,
      "predicative.agreement.1sg",
    );

    expect(engine.realize(questionedState).surface).toBe("ev miyim");
  });

  it("supports adjective-based predicative chains without exposing noun inflection", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "güzel",
        pos: "Noun",
        category: "Adjective",
      }),
    );

    state = engine.applyAction(state, "predicative.agreement.1sg");
    expect(engine.realize(state).surface).toBe("güzelim");
    expect(state.currentCategory).toBe("Predicative");

    let evidentialState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "güzel",
        pos: "Noun",
        category: "Adjective",
      }),
    );

    evidentialState = engine.applyAction(evidentialState, "postfinite.copula.imiş");
    expect(engine.realize(evidentialState).surface).toBe("güzelmiş");

    let questionedState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "güzel",
        pos: "Noun",
        category: "Adjective",
      }),
    );

    questionedState = engine.applyAction(questionedState, "postfinite.question.mI");
    questionedState = engine.applyAction(
      questionedState,
      "predicative.agreement.1sg",
    );

    expect(engine.realize(questionedState).surface).toBe("güzel miyim");
  });

  it("supports adjective derivation into noun, verb, and adverb categories", () => {
    let nounState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "güzel",
        pos: "Noun",
        category: "Adjective",
      }),
    );

    nounState = engine.applyAction(nounState, "adjective.deriv.lIk");

    expect(engine.realize(nounState).surface).toBe("güzellik");
    expect(nounState.currentCategory).toBe("Noun");
    expect(
      engine.getAvailableActions(nounState).some((action) => action.id === "noun.case.loc"),
    ).toBe(true);

    let verbState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "güzel",
        pos: "Noun",
        category: "Adjective",
      }),
    );

    verbState = engine.applyAction(verbState, "adjective.deriv.lAş");
    verbState = engine.applyAction(verbState, "verb.tam.past");

    expect(engine.realize(verbState).surface).toBe("güzelleşti");
    expect(verbState.currentCategory).toBe("Verb");

    let adverbState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "güzel",
        pos: "Noun",
        category: "Adjective",
      }),
    );

    adverbState = engine.applyAction(adverbState, "adjective.deriv.CA");

    expect(engine.realize(adverbState).surface).toBe("güzelce");
    expect(adverbState.currentCategory).toBe("Adverb");
    expect(engine.getAvailableActions(adverbState)).toHaveLength(0);
  });

  it("supports assertive predicative forms", () => {
    let possessedState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    possessedState = engine.applyAction(possessedState, "noun.possessive.p1sg");
    possessedState = engine.applyAction(possessedState, "predicative.assertive.dIr");

    expect(engine.realize(possessedState).surface).toBe("evimdir");
    expect(possessedState.currentCategory).toBe("Predicative");

    let agreedState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "öğretmen",
        pos: "Noun",
      }),
    );

    agreedState = engine.applyAction(agreedState, "predicative.agreement.1sg");
    agreedState = engine.applyAction(agreedState, "predicative.assertive.dIr");

    expect(engine.realize(agreedState).surface).toBe("öğretmenimdir");
  });

  it("exposes a second post-finite overlay after question particle selection", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.tam.prog");
    state = engine.applyAction(state, "postfinite.question.mI");

    const actions = engine.getAvailableActions(state);

    expect(actions.some((action) => action.id === "postfinite.copula.idi")).toBe(true);
    expect(actions.some((action) => action.id === "postfinite.copula.imiş")).toBe(true);
    expect(actions.some((action) => action.id === "postfinite.conditional.ise")).toBe(true);
    expect(
      actions.some((action) => action.id === "postfinite.question.mI"),
    ).toBe(false);
    expect(actions.some((action) => action.id === "postfinite.while.iken")).toBe(false);
  });

  it("supports chained question plus copular and conditional post-finite overlays", () => {
    let pastState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    pastState = engine.applyAction(pastState, "verb.tam.prog");
    pastState = engine.applyAction(pastState, "postfinite.question.mI");
    pastState = engine.applyAction(pastState, "postfinite.copula.idi");

    expect(engine.realize(pastState).surface).toBe("geliyor muydu");

    let evidentialState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    evidentialState = engine.applyAction(evidentialState, "verb.tam.prog");
    evidentialState = engine.applyAction(evidentialState, "postfinite.question.mI");
    evidentialState = engine.applyAction(evidentialState, "postfinite.copula.imiş");

    expect(engine.realize(evidentialState).surface).toBe("geliyor muymuş");

    let conditionalState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    conditionalState = engine.applyAction(conditionalState, "verb.tam.fut");
    conditionalState = engine.applyAction(conditionalState, "postfinite.question.mI");
    conditionalState = engine.applyAction(
      conditionalState,
      "postfinite.conditional.ise",
    );

    expect(engine.realize(conditionalState).surface).toBe("gelecek miyse");

    let nominalState = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "ev",
        pos: "Noun",
      }),
    );

    nominalState = engine.applyAction(nominalState, "noun.case.loc");
    nominalState = engine.applyAction(nominalState, "postfinite.question.mI");
    nominalState = engine.applyAction(nominalState, "postfinite.copula.imiş");

    expect(engine.realize(nominalState).surface).toBe("evde miymiş");
    expect(nominalState.currentCategory).toBe("Predicative");
  });

  it("closes the post-finite chain after a second overlay has been selected", () => {
    let state = engine.initializeState(
      createLexemeEntryFromRoot({
        surface: "gel",
        pos: "Verb",
      }),
    );

    state = engine.applyAction(state, "verb.tam.prog");
    state = engine.applyAction(state, "postfinite.question.mI");
    state = engine.applyAction(state, "postfinite.copula.idi");

    expect(
      engine.getAvailableActions(state).some((action) => action.kind === "postfinite"),
    ).toBe(false);
  });
});
