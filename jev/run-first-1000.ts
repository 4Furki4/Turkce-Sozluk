import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
config({ path: ".env.development.local", quiet: true });

const WORD_LIMIT = 1_000;
const CANDIDATES_PER_WORD = 5;
const CONCURRENCY = 6;
const MODEL = "jev-latest";
const OUTPUT = resolve("jev/output/first-1000.json");
const PARTIAL_OUTPUT = resolve("jev/output/first-1000.partial.json");
const LEVELS = [
  "The two Turkish words have no meaningful dictionary relationship in the supplied meanings.",
  "The two words share only a broad topic or context; a dictionary relation would be misleading.",
  "The two words have a useful but indirect semantic relationship in at least one supplied meaning.",
  "The two words have a clear direct dictionary relationship in at least one supplied meaning, such as synonymy, antonymy, a lexical variant, a compound, or a strong see-also link.",
] as const;

type Word = { id: number; name: string; meanings: string[]; tokens: Set<string> };
type Candidate = { word: Word; retrievalScore: number };
type ScoreResult = {
  sourceWordId: number;
  sourceWord: string;
  sourceMeanings: string[];
  candidateWordId: number;
  candidateWord: string;
  candidateMeanings: string[];
  retrievalScore: number;
  score: number;
  confidence: number;
  probabilities: Record<string, number>;
  model: string;
};
type Output = {
  status: "partial" | "complete";
  generatedAt: string;
  runKey: string;
  databaseSource: string;
  source: { firstWordId: number | null; lastWordId: number | null; wordCount: number; corpusWordCount: number };
  candidateMethod: string;
  candidatesPerWord: number;
  scoreLevels: readonly string[];
  results: ScoreResult[];
};

function tokenize(text: string): Set<string> {
  const tokens = text.normalize("NFC").toLocaleLowerCase("tr-TR").match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(tokens.filter((token) => token.length >= 3));
}

function getCandidates(source: Word, words: Word[], postings: Map<string, number[]>, documentFrequency: Map<string, number>, existing: Set<number>): Candidate[] {
  const scores = new Map<number, number>();
  for (const token of source.tokens) {
    const ids = postings.get(token);
    if (!ids || ids.length > words.length / 10) continue;
    const weight = Math.log(1 + words.length / (1 + (documentFrequency.get(token) ?? 0)));
    for (const index of ids) {
      const target = words[index];
      if (target.id === source.id || existing.has(target.id) || target.meanings.length === 0) continue;
      scores.set(index, (scores.get(index) ?? 0) + weight);
    }
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || words[a[0]].id - words[b[0]].id)
    .slice(0, CANDIDATES_PER_WORD)
    .map(([index, retrievalScore]) => ({ word: words[index], retrievalScore: Number(retrievalScore.toFixed(4)) }));
}

async function scorePair(source: Word, candidate: Candidate, apiKey: string): Promise<Pick<ScoreResult, "score" | "confidence" | "probabilities" | "model">> {
  const body = {
    model: MODEL,
    state: {
      language: "Turkish",
      source: { word: source.name, meanings: source.meanings },
      candidate: { word: candidate.word.name, meanings: candidate.word.meanings },
    },
    questions: {
      relation_strength: {
        type: "score",
        instructions: "How strong is the dictionary relationship between `source.word` and `candidate.word` based on their supplied Turkish meanings? Judge the best matching sense. Similar spelling or a shared topic alone is insufficient for a direct relation.",
        criteria: LEVELS,
      },
    },
  };

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : 1_000 * 2 ** attempt;
      await new Promise((done) => setTimeout(done, delay));
      continue;
    }
    if (!response.ok) throw new Error(`TypeSafe API returned HTTP ${response.status}`);
    const data = await response.json() as {
      model?: string;
      answers?: { relation_strength?: { type?: string; score?: number; confidence?: number; probabilities?: Record<string, number> } };
    };
    const answer = data.answers?.relation_strength;
    if (answer?.type !== "score" || typeof answer.score !== "number" || typeof answer.confidence !== "number" || !answer.probabilities) {
      throw new Error("TypeSafe API returned an invalid Score answer");
    }
    return { score: answer.score, confidence: answer.confidence, probabilities: answer.probabilities, model: data.model ?? MODEL };
  }
  throw new Error("TypeSafe API retry limit reached");
}

async function save(path: string, output: Output) {
  await mkdir(resolve("jev/output"), { recursive: true });
  const temp = `${path}.tmp`;
  await writeFile(temp, `${JSON.stringify(output, null, 2)}\n`);
  await rename(temp, path);
}

async function main() {
  const apiKey = process.env.TYPESAFE_API_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  if (!apiKey) throw new Error("TYPESAFE_API_KEY is required in the process environment");
  if (!databaseUrl) throw new Error("DATABASE_URL is required (the script reads .env.local)");

  const db = postgres(databaseUrl, { max: 1, connect_timeout: 5, idle_timeout: 5 });
  try {
    const sourceRows = await db<{ id: number; name: string }[]>`
      SELECT id, name FROM words ORDER BY id LIMIT ${WORD_LIMIT}
    `;
    if (sourceRows.length === 0) throw new Error("The database has no words");
    const wordRows = await db<{ id: number; name: string; meaning: string | null }[]>`
      SELECT w.id, w.name, m.meaning
      FROM words w LEFT JOIN meanings m ON m.word_id = w.id
      ORDER BY w.id, m."order", m.id
    `;
    const words: Word[] = [];
    for (const row of wordRows) {
      let word = words.at(-1);
      if (word?.id !== row.id) {
        word = { id: row.id, name: row.name, meanings: [], tokens: new Set() };
        words.push(word);
      }
      if (row.meaning) word.meanings.push(row.meaning);
    }
    const firstWordId = sourceRows[0].id;
    const lastWordId = sourceRows.at(-1)!.id;
    const existingRows = await db<{ word_id: number; related_word_id: number }[]>`
      SELECT word_id, related_word_id FROM related_words
      WHERE word_id BETWEEN ${firstWordId} AND ${lastWordId}
    `;
    const existing = new Map<number, Set<number>>();
    for (const row of existingRows) {
      const targets = existing.get(row.word_id) ?? new Set<number>();
      targets.add(row.related_word_id);
      existing.set(row.word_id, targets);
    }
    const postings = new Map<string, number[]>();
    const documentFrequency = new Map<string, number>();
    words.forEach((word, index) => {
      word.tokens = tokenize(`${word.name} ${word.meanings.join(" ")}`);
      for (const token of word.tokens) {
        const ids = postings.get(token) ?? [];
        ids.push(index);
        postings.set(token, ids);
        documentFrequency.set(token, ids.length);
      }
    });

    const databaseSource = process.env.JEV_DATA_SOURCE ?? "local database";
    const runKey = createHash("sha256").update(JSON.stringify({ databaseSource, firstWordId, lastWordId, sourceWordIds: sourceRows.map((row) => row.id), corpusWordCount: words.length, candidatesPerWord: CANDIDATES_PER_WORD, model: MODEL, levels: LEVELS })).digest("hex");
    let output: Output = {
      status: "partial",
      generatedAt: new Date().toISOString(),
      runKey,
      databaseSource,
      source: { firstWordId, lastWordId, wordCount: sourceRows.length, corpusWordCount: words.length },
      candidateMethod: "Turkish lowercased word and meaning token overlap, weighted by inverse document frequency; existing outgoing relations excluded",
      candidatesPerWord: CANDIDATES_PER_WORD,
      scoreLevels: LEVELS,
      results: [],
    };
    try {
      const prior = JSON.parse(await readFile(PARTIAL_OUTPUT, "utf8")) as Output;
      if (prior.runKey !== runKey) throw new Error("Existing partial output belongs to a different run; move it before retrying");
      output = prior;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        // First run: no checkpoint yet.
      } else {
        throw error;
      }
    }

    const completed = new Set(output.results.map((result) => `${result.sourceWordId}:${result.candidateWordId}`));
    const wordById = new Map(words.map((word) => [word.id, word]));
    const work: Array<{ source: Word; candidate: Candidate }> = [];
    for (const row of sourceRows) {
      const source = wordById.get(row.id)!;
      if (source.meanings.length === 0) continue;
      const candidates = getCandidates(source, words, postings, documentFrequency, existing.get(source.id) ?? new Set());
      for (const candidate of candidates) {
        const pairKey = `${source.id}:${candidate.word.id}`;
        if (completed.has(pairKey)) continue;
        work.push({ source, candidate });
      }
    }
    console.log(`Scoring ${work.length} candidate pairs for ${sourceRows.length} words`);
    for (let offset = 0; offset < work.length; offset += CONCURRENCY) {
      const batch = work.slice(offset, offset + CONCURRENCY);
      const responses = await Promise.allSettled(batch.map(({ source, candidate }) => scorePair(source, candidate, apiKey)));
      for (let index = 0; index < responses.length; index++) {
        const response = responses[index];
        if (response.status !== "fulfilled") continue;
        const { source, candidate } = batch[index];
        output.results.push({
          sourceWordId: source.id,
          sourceWord: source.name,
          sourceMeanings: source.meanings,
          candidateWordId: candidate.word.id,
          candidateWord: candidate.word.name,
          candidateMeanings: candidate.word.meanings,
          retrievalScore: candidate.retrievalScore,
          ...response.value,
        });
      }
      if (offset % 24 === 0 || responses.some((response) => response.status === "rejected")) {
        output.generatedAt = new Date().toISOString();
        await save(PARTIAL_OUTPUT, output);
        console.log(`Scored ${output.results.length} pairs`);
      }
      const failed = responses.find((response) => response.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
    }
    output.status = "complete";
    output.generatedAt = new Date().toISOString();
    await save(OUTPUT, output);
    await rm(PARTIAL_OUTPUT, { force: true });
    console.log(`Wrote ${output.results.length} Jev scores to ${OUTPUT}`);
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
