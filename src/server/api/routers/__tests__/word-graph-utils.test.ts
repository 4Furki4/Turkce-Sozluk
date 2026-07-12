/** @jest-environment node */

import { getWordGraphNeighborhood, normalizeWordGraphRows } from "../word-graph-utils";

const center = { id: 1, name: "kitap" };

const baseRows = [
  {
    sourceId: 1,
    sourceName: "kitap",
    targetId: 2,
    targetName: "defter",
    relationType: "synonym",
    direction: "outgoing" as const,
    sourceTable: "related_words" as const,
  },
  {
    sourceId: 3,
    sourceName: "okumak",
    targetId: 1,
    targetName: "kitap",
    relationType: "relatedWord",
    direction: "incoming" as const,
    sourceTable: "related_words" as const,
  },
];

function createDbMock({ centerRows = [center], graphRows = baseRows } = {}) {
  return {
    execute: jest
      .fn()
      .mockResolvedValueOnce(centerRows)
      .mockResolvedValue(graphRows),
  };
}

describe("word graph utilities", () => {
  it("builds a graph neighborhood from a center word id", async () => {
    const db = createDbMock();

    const result = await getWordGraphNeighborhood(db, { wordId: 1, depth: 1 });

    expect(result.centerNodeId).toBe(1);
    expect(result.nodes).toEqual([
      { id: 1, name: "kitap", kind: "center" },
      { id: 2, name: "defter", kind: "word" },
      { id: 3, name: "okumak", kind: "word" },
    ]);
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0]).toMatchObject({
      sourceId: 1,
      targetId: 2,
      relationType: "synonym",
      direction: "outgoing",
    });
    expect(db.execute).toHaveBeenCalledTimes(2);
  });

  it("builds an empty graph for a word with no stored relations", async () => {
    const db = createDbMock({ graphRows: [] });

    const result = await getWordGraphNeighborhood(db, { word: "kitap", depth: 1 });

    expect(result).toEqual({
      centerNodeId: 1,
      nodes: [{ id: 1, name: "kitap", kind: "center" }],
      edges: [],
      truncated: false,
    });
  });

  it("throws NOT_FOUND when the center word cannot be resolved", async () => {
    const db = createDbMock({ centerRows: [] });

    await expect(getWordGraphNeighborhood(db, { word: "missing" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("keeps depth-two edges returned by the bounded recursive query", async () => {
    const db = createDbMock({
      graphRows: [
        ...baseRows,
        {
          sourceId: 2,
          sourceName: "defter",
          targetId: 4,
          targetName: "sayfa",
          relationType: "relatedWord",
          direction: "outgoing" as const,
          sourceTable: "related_words" as const,
        },
      ],
    });

    const result = await getWordGraphNeighborhood(db, { wordId: 1, depth: 2 });

    expect(result.nodes.map((node) => node.name)).toContain("sayfa");
    expect(result.edges).toHaveLength(3);
  });

  it("represents related phrases as phrase nodes and phrase edges", async () => {
    const db = createDbMock({
      graphRows: [
        {
          sourceId: 1,
          sourceName: "kitap",
          targetId: 5,
          targetName: "kitap gibi",
          relationType: "phrase",
          direction: "outgoing" as const,
          sourceTable: "related_phrases" as const,
        },
      ],
    });

    const result = await getWordGraphNeighborhood(db, {
      wordId: 1,
      relationTypes: ["phrase"],
      includePhrases: true,
    });

    expect(result.nodes).toContainEqual({ id: 5, name: "kitap gibi", kind: "phrase" });
    expect(result.edges[0]).toMatchObject({
      relationType: "phrase",
      sourceTable: "related_phrases",
    });
  });

  it("returns the filtered relation set supplied by the query", async () => {
    const db = createDbMock({
      graphRows: baseRows.filter((row) => row.relationType === "synonym"),
    });

    const result = await getWordGraphNeighborhood(db, {
      wordId: 1,
      relationTypes: ["synonym"],
    });

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].relationType).toBe("synonym");
  });

  it("marks the graph truncated when the node limit is exceeded", () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
      sourceId: 1,
      sourceName: "kitap",
      targetId: index + 2,
      targetName: `word ${index + 2}`,
      relationType: "relatedWord",
      direction: "outgoing" as const,
      sourceTable: "related_words" as const,
    }));

    const result = normalizeWordGraphRows(center, rows, {
      nodeLimit: 5,
      edgeScanLimit: 300,
    });

    expect(result.nodes).toHaveLength(5);
    expect(result.truncated).toBe(true);
    expect(result.edges.every((edge) => edge.targetId <= 5)).toBe(true);
  });

  it("marks the graph truncated when the edge scan limit is reached", () => {
    const result = normalizeWordGraphRows(center, baseRows, {
      nodeLimit: 75,
      edgeScanLimit: baseRows.length,
    });

    expect(result.truncated).toBe(true);
  });
});
