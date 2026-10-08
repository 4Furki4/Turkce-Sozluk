import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
config({ path: ".env.development.local", quiet: true });

const MODEL = "jev-latest";
const CANDIDATES_PER_WORD = 5;
const PAIRS_PER_REQUEST = 5;
const CONCURRENCY = 6;
const MAX_NEW_SPEND_USD = 4.84;
const INPUT_PRICE_PER_MILLION_USD = 0.042;
const MAX_RESERVED_TOKENS_PER_REQUEST = 40_000;
const MAX_MEANING_CHARS_PER_WORD = 4_000;
const OUTPUT = resolve("jev/output/all-words.ndjson");
const STATUS = resolve("jev/output/all-words-status.json");
const LEVELS = [
  "The two Turkish words have no meaningful dictionary relationship in the supplied meanings.",
  "The two words share only a broad topic or context; a dictionary relation would be misleading.",
  "The two words have a useful but indirect semantic relationship in at least one supplied meaning.",
  "The two words have a clear direct dictionary relationship in at least one supplied meaning, such as synonymy, antonymy, a lexical variant, a compound, or a strong see-also link.",
] as const;

type Word = { id: number; name: string; meanings: string[]; tokens: Set<string> };
type Candidate = { word: Word; retrievalScore: number };
type Task = { source: Word; candidate: Candidate; rank: number };
type PairResult = {
  sourceWordId: number;
  sourceWord: string;
  sourceMeanings: string[];
  sourceMeaningsTruncated: boolean;
  candidateWordId: number;
  candidateWord: string;
  candidateMeanings: string[];
  candidateMeaningsTruncated: boolean;
  candidateRank: number;
  retrievalScore: number;
  score: number;
  confidence: number;
  probabilities: Record<string, number>;
};
type BatchRecord = {
  runKey: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  results: PairResult[];
};
type RunStatus = {
  status: "running" | "budget_reached" | "credits_exhausted" | "complete" | "failed";
  updatedAt: string;
  runKey: string;
  databaseSource: string;
  model: string;
  scoreLevels: readonly string[];
  candidateMethod: string;
  totalWords: number;
  eligibleWords: number;
  candidatePairs: number;
  scoredPairs: number;
  scoredSourceWords: number;
  inputTokens: number;
  estimatedNewSpendUsd: number;
  maxNewSpendUsd: number;
  inputPricePerMillionUsd: number;
  scoreBands: { weak: number; possible: number; strong: number };
  error?: string;
};

function tokenize(text: string): Set<string> {
  const tokens = text.normalize("NFC").toLocaleLowerCase("tr-TR").match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(tokens.filter((token) => token.length >= 3));
}

function getCandidates(source: Word, words: Word[], postings: Map<string, number[]>, existing: Set<number>): Candidate[] {
  const scores = new Map<number, number>();
  for (const token of source.tokens) {
    const ids = postings.get(token);
    if (!ids || ids.length > words.length / 10) continue;
    const weight = Math.log(1 + words.length / (1 + ids.length));
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

function compactMeanings(meanings: string[]): { values: string[]; truncated: boolean } {
  const values: string[] = [];
  let remaining = MAX_MEANING_CHARS_PER_WORD;
  for (const meaning of meanings) {
    if (remaining <= 0) break;
    values.push(meaning.slice(0, remaining));
    remaining -= meaning.length;
  }
  return { values, truncated: values.length < meanings.length || remaining < 0 };
}

async function scoreBatch(tasks: Task[], apiKey: string, runKey: string): Promise<BatchRecord> {
  const statePairs = tasks.map(({ source, candidate }) => ({
    source: { word: source.name, meanings: compactMeanings(source.meanings).values },
    candidate: { word: candidate.word.name, meanings: compactMeanings(candidate.word.meanings).values },
  }));
  const questions = Object.fromEntries(tasks.map((_, index) => [
    `pair_${index}`,
    {
      type: "score",
      instructions: `For pairs[${index}] only, how strong is the dictionary relationship between its source and candidate Turkish words based on their supplied meanings? Judge the best matching sense. Similar spelling or a shared topic alone is insufficient for a direct relation.`,
      criteria: LEVELS,
    },
  ]));
  const body = JSON.stringify({ model: MODEL, state: { language: "Turkish", pairs: statePairs }, questions });

  for (let attempt = 0; attempt < 5; attempt++) {
    let response: Response;
    try {
      response = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((done) => setTimeout(done, 1_000 * 2 ** attempt));
      continue;
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : 1_000 * 2 ** attempt;
      await new Promise((done) => setTimeout(done, delay));
      continue;
    }
    if (response.status === 402) throw new Error("TypeSafe credits exhausted (HTTP 402)");
    if (!response.ok) throw new Error(`TypeSafe API returned HTTP ${response.status}`);
    const data = await response.json() as {
      model?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
      answers?: Record<string, { type?: string; score?: number; confidence?: number; probabilities?: Record<string, number> }>;
    };
    if (!Number.isInteger(data.usage?.input_tokens) || (data.usage?.input_tokens ?? 0) < 0) {
      throw new Error("TypeSafe API response has no valid input token usage");
    }
    const results = tasks.map(({ source, candidate, rank }, index): PairResult => {
      const answer = data.answers?.[`pair_${index}`];
      if (answer?.type !== "score" || typeof answer.score !== "number" || typeof answer.confidence !== "number" || !answer.probabilities) {
        throw new Error(`TypeSafe API returned an invalid Score answer for pair_${index}`);
      }
      const sourceContext = compactMeanings(source.meanings);
      const candidateContext = compactMeanings(candidate.word.meanings);
      return {
        sourceWordId: source.id,
        sourceWord: source.name,
        sourceMeanings: sourceContext.values,
        sourceMeaningsTruncated: sourceContext.truncated,
        candidateWordId: candidate.word.id,
        candidateWord: candidate.word.name,
        candidateMeanings: candidateContext.values,
        candidateMeaningsTruncated: candidateContext.truncated,
        candidateRank: rank,
        retrievalScore: candidate.retrievalScore,
        score: answer.score,
        confidence: answer.confidence,
        probabilities: answer.probabilities,
      };
    });
    return { runKey, model: data.model ?? MODEL, inputTokens: data.usage!.input_tokens!, outputTokens: data.usage?.output_tokens ?? 0, results };
  }
  throw new Error("TypeSafe API retry limit reached");
}

async function saveStatus(status: RunStatus) {
  status.updatedAt = new Date().toISOString();
  status.estimatedNewSpendUsd = Number((status.inputTokens / 1_000_000 * INPUT_PRICE_PER_MILLION_USD).toFixed(6));
  await mkdir(resolve("jev/output"), { recursive: true });
  const temp = `${STATUS}.tmp`;
  await writeFile(temp, `${JSON.stringify(status, null, 2)}\n`);
  await rename(temp, STATUS);
}

async function loadCompleted(runKey: string, status: RunStatus): Promise<{ pairs: Set<string>; sources: Set<number> }> {
  const pairs = new Set<string>();
  const sources = new Set<number>();
  try {
    const stream = createInterface({ input: createReadStream(OUTPUT), crlfDelay: Infinity });
    for await (const line of stream) {
      if (!line) continue;
      const record = JSON.parse(line) as BatchRecord;
      if (record.runKey !== runKey) throw new Error("Existing all-words output belongs to a different database or scoring setup");
      status.inputTokens += record.inputTokens;
      for (const result of record.results) {
        const pairKey = `${result.sourceWordId}:${result.candidateWordId}`;
        if (pairs.has(pairKey)) throw new Error(`Duplicate pair in output: ${pairKey}`);
        pairs.add(pairKey);
        sources.add(result.sourceWordId);
        status.scoredPairs++;
        if (result.score < 1) status.scoreBands.weak++;
        else if (result.score < 2) status.scoreBands.possible++;
        else status.scoreBands.strong++;
      }
    }
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  status.scoredSourceWords = sources.size;
  return { pairs, sources };
}

async function main() {
  const apiKey = process.env.TYPESAFE_API_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  if (!apiKey) throw new Error("TYPESAFE_API_KEY is required");
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const databaseSource = process.env.JEV_DATA_SOURCE ?? "local database";
  const db = postgres(databaseUrl, { max: 1, connect_timeout: 5, idle_timeout: 5 });
  try {
    const rows = await db<{ id: number; name: string; meaning: string | null }[]>`
      SELECT w.id, w.name, m.meaning
      FROM words w LEFT JOIN meanings m ON m.word_id = w.id
      ORDER BY w.id, m."order", m.id
    `;
    const words: Word[] = [];
    const snapshotHash = createHash("sha256");
    for (const row of rows) {
      snapshotHash.update(`${row.id}\0${row.name}\0${row.meaning ?? ""}\n`);
      let word = words.at(-1);
      if (word?.id !== row.id) {
        word = { id: row.id, name: row.name, meanings: [], tokens: new Set() };
        words.push(word);
      }
      if (row.meaning) word.meanings.push(row.meaning);
    }
    if (words.length === 0) throw new Error("The database has no words");
    const relationRows = await db<{ word_id: number; related_word_id: number }[]>`
      SELECT word_id, related_word_id FROM related_words
    `;
    const existing = new Map<number, Set<number>>();
    for (const row of relationRows) {
      const targets = existing.get(row.word_id) ?? new Set<number>();
      targets.add(row.related_word_id);
      existing.set(row.word_id, targets);
    }
    const postings = new Map<string, number[]>();
    words.forEach((word, index) => {
      word.tokens = tokenize(`${word.name} ${word.meanings.join(" ")}`);
      for (const token of word.tokens) {
        const ids = postings.get(token) ?? [];
        ids.push(index);
        postings.set(token, ids);
      }
    });
    const runKey = createHash("sha256").update(JSON.stringify({ snapshot: snapshotHash.digest("hex"), databaseSource, model: MODEL, levels: LEVELS, candidateCount: CANDIDATES_PER_WORD, method: "idf-v1", maxMeaningChars: MAX_MEANING_CHARS_PER_WORD })).digest("hex");
    const status: RunStatus = {
      status: "running", updatedAt: new Date().toISOString(), runKey, databaseSource, model: MODEL,
      scoreLevels: LEVELS,
      candidateMethod: "Turkish lowercased word and meaning token overlap, weighted by inverse document frequency; existing outgoing relations excluded; candidates ranked across the full local corpus",
      totalWords: words.length, eligibleWords: 0, candidatePairs: 0, scoredPairs: 0, scoredSourceWords: 0,
      inputTokens: 0, estimatedNewSpendUsd: 0, maxNewSpendUsd: MAX_NEW_SPEND_USD,
      inputPricePerMillionUsd: INPUT_PRICE_PER_MILLION_USD,
      scoreBands: { weak: 0, possible: 0, strong: 0 },
    };
    try {
      const prior = JSON.parse(await readFile(STATUS, "utf8")) as RunStatus;
      if (prior.runKey !== runKey) throw new Error("Existing run status belongs to a different database or scoring setup");
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    const { pairs: completed, sources: scoredSources } = await loadCompleted(runKey, status);
    const passes: Task[][] = Array.from({ length: CANDIDATES_PER_WORD }, () => []);
    for (const source of words) {
      if (source.meanings.length === 0) continue;
      status.eligibleWords++;
      const candidates = getCandidates(source, words, postings, existing.get(source.id) ?? new Set());
      candidates.forEach((candidate, index) => {
        status.candidatePairs++;
        if (!completed.has(`${source.id}:${candidate.word.id}`)) passes[index].push({ source, candidate, rank: index + 1 });
      });
    }
    const work = passes.flat();
    console.log(`Loaded ${status.totalWords} words; ${status.candidatePairs} candidate pairs; ${work.length} remaining`);
    await saveStatus(status);
    const budgetTokens = Math.floor(MAX_NEW_SPEND_USD / INPUT_PRICE_PER_MILLION_USD * 1_000_000);
    let offset = 0;
    let waves = 0;
    while (offset < work.length) {
      const remainingBudget = budgetTokens - status.inputTokens;
      const requestsToLaunch = Math.min(CONCURRENCY, Math.floor(remainingBudget / MAX_RESERVED_TOKENS_PER_REQUEST));
      if (requestsToLaunch === 0) {
        status.status = "budget_reached";
        break;
      }
      const batches: Task[][] = [];
      for (let index = 0; index < requestsToLaunch && offset < work.length; index++) {
        batches.push(work.slice(offset, offset + PAIRS_PER_REQUEST));
        offset += batches.at(-1)!.length;
      }
      const responses = await Promise.allSettled(batches.map((batch) => scoreBatch(batch, apiKey, runKey)));
      for (const response of responses) {
        if (response.status !== "fulfilled") continue;
        const record = response.value;
        await appendFile(OUTPUT, `${JSON.stringify(record)}\n`);
        status.inputTokens += record.inputTokens;
        for (const result of record.results) {
          const pairKey = `${result.sourceWordId}:${result.candidateWordId}`;
          completed.add(pairKey);
          scoredSources.add(result.sourceWordId);
          status.scoredPairs++;
          if (result.score < 1) status.scoreBands.weak++;
          else if (result.score < 2) status.scoreBands.possible++;
          else status.scoreBands.strong++;
        }
      }
      status.scoredSourceWords = scoredSources.size;
      waves++;
      if (waves % 100 === 0) {
        await saveStatus(status);
        console.log(`Scored ${status.scoredPairs} pairs across ${status.scoredSourceWords} words; estimated new spend $${status.estimatedNewSpendUsd.toFixed(4)}`);
      }
      const failure = responses.find((response) => response.status === "rejected");
      if (failure?.status === "rejected") {
        const message = failure.reason instanceof Error ? failure.reason.message : String(failure.reason);
        status.status = message.includes("credits exhausted") ? "credits_exhausted" : "failed";
        status.error = message;
        break;
      }
    }
    if (offset >= work.length && status.status === "running") status.status = "complete";
    await saveStatus(status);
    console.log(`Stopped: ${status.status}. ${status.scoredPairs} pairs, ${status.scoredSourceWords} words, estimated new spend $${status.estimatedNewSpendUsd.toFixed(4)}`);
    if (status.status === "failed") process.exitCode = 1;
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
