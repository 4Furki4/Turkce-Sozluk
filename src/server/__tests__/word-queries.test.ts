/** @jest-environment node */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { findWordDataByName } from "../word-queries";
import { getRandomGameWords } from "../game/random-words";

const databaseTests = process.env.QUERY_TEST_DATABASE_URL ? describe : describe.skip;
databaseTests("word lookup with PostgreSQL", () => {
  const connection = postgres(process.env.QUERY_TEST_DATABASE_URL!, { max: 1 });
  const rollback = new Error("fixture rollback");
  afterAll(() => connection.end());

  test("preserves exact case, substantive meaning preference, variants and child order", async () => {
    try {
      await connection.begin(async (tx) => {
        const base = -Math.floor(Math.random() * 100_000_000) - 100;
        await tx`INSERT INTO words (id, name, variant) VALUES
          (${base}, 'codexfixture', 0), (${base - 1}, 'codexfixture', 3),
          (${base - 2}, 'codexfixture', 1), (${base - 3}, 'CODEXFIXTURE', 0)`;
        await tx`INSERT INTO meanings (id, word_id, meaning, "order") VALUES
          (${base}, ${base}, '  bakınız: başka  ', 1),
          (${base - 1}, ${base - 1}, 'variant three', 1),
          (${base - 2}, ${base - 2}, 'second', 2),
          (${base - 3}, ${base - 2}, 'first', 1),
          (${base - 4}, ${base - 3}, 'bakınız: başka', 1)`;
        const db = drizzle(Object.assign(tx, { options: connection.options })) as unknown as Parameters<typeof findWordDataByName>[0];
        const lower = await findWordDataByName(db, "codexfixture");
        expect(lower[0].word_data.word_id).toBe(base - 2);
        expect(lower[0].word_data.meanings.map((meaning) => meaning.meaning)).toEqual(["first", "second"]);
        expect(lower[0].word_data.relatedWords).toEqual([]);
        expect(lower[0].word_data.attributes).toEqual([]);
        // Exact case still wins over a differently cased substantive entry.
        expect((await findWordDataByName(db, "CODEXFIXTURE"))[0].word_data.word_id).toBe(base - 3);
        expect(await findWordDataByName(db, "codex-fixture-missing")).toEqual([]);
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
  });

  test("keeps Turkish dotted and dotless exact names isolated", async () => {
    try {
      await connection.begin(async (tx) => {
        const base = -Math.floor(Math.random() * 100_000_000) - 100;
        const names = ["Icodexfixture", "İcodexfixture", "ıcodexfixture", "icodexfixture"];
        for (const [index, name] of names.entries()) {
          await tx`INSERT INTO words (id, name) VALUES (${base - index}, ${name})`;
        }
        const db = drizzle(Object.assign(tx, { options: connection.options })) as unknown as Parameters<typeof findWordDataByName>[0];
        for (const [index, name] of names.entries()) {
          expect((await findWordDataByName(db, name))[0].word_data.word_id).toBe(base - index);
        }
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
  });

  test("game sampling keeps each sampled meaning attached to its eligible word", async () => {
    const rows = await getRandomGameWords(drizzle(connection) as never, 30);
    expect(rows).toHaveLength(30);
    expect(new Set(rows.map((row) => row.meaningId)).size).toBe(30);
    for (const row of rows) {
      const [stored] = await connection`SELECT w.name, m.meaning FROM meanings m JOIN words w ON w.id = m.word_id WHERE m.id = ${row.meaningId} AND w.id = ${row.id}`;
      expect(stored).toEqual({ name: row.name, meaning: row.meaning });
    }
  });
});
