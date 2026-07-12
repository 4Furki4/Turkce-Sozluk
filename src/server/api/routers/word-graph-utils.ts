import { TRPCError } from "@trpc/server";
import { sql, type SQLWrapper } from "drizzle-orm";
import { z } from "zod";

export const GRAPH_NODE_LIMIT = 75;
export const GRAPH_EDGE_SCAN_LIMIT = 300;
export const PHRASE_RELATION_TYPE = "phrase";

export const graphInputSchema = z
  .object({
    wordId: z.number().int().positive().optional(),
    word: z.string().trim().min(1).max(255).optional(),
    depth: z.union([z.literal(1), z.literal(2)]).optional().default(1),
    relationTypes: z.array(z.string().trim().min(1).max(64)).optional().default([]),
    includePhrases: z.boolean().optional().default(true),
  })
  .refine((input) => input.wordId !== undefined || input.word !== undefined, {
    message: "Either wordId or word is required.",
    path: ["wordId"],
  });

export type WordGraphNode = {
  id: number;
  name: string;
  kind: "center" | "word" | "phrase";
};

export type WordGraphEdge = {
  id: string;
  sourceId: number;
  targetId: number;
  relationType: string;
  direction: "incoming" | "outgoing";
  sourceTable: "related_words" | "related_phrases";
};

export type WordGraphResult = {
  centerNodeId: number;
  nodes: WordGraphNode[];
  edges: WordGraphEdge[];
  truncated: boolean;
};

type CenterWordRow = {
  id: number;
  name: string;
};

type GraphEdgeRow = {
  sourceId: number;
  sourceName: string;
  targetId: number;
  targetName: string;
  relationType: string | null;
  direction: "incoming" | "outgoing";
  sourceTable: "related_words" | "related_phrases";
};

type GraphDb = {
  execute: (query: string | SQLWrapper) => Promise<unknown>;
};

export async function getWordGraphNeighborhood(
  db: GraphDb,
  input: z.input<typeof graphInputSchema>,
): Promise<WordGraphResult> {
  const parsedInput = graphInputSchema.parse(input);
  const relationTypes = normalizeRelationTypes(parsedInput.relationTypes);
  const wordRelationTypes = relationTypes.filter((type) => type !== PHRASE_RELATION_TYPE);
  const includesOnlyPhraseFilter =
    relationTypes.length > 0 && relationTypes.every((type) => type === PHRASE_RELATION_TYPE);
  const includeWordRelations = !includesOnlyPhraseFilter;
  const includePhraseRelations =
    parsedInput.includePhrases &&
    (relationTypes.length === 0 || relationTypes.includes(PHRASE_RELATION_TYPE));

  const centerRows = await db.execute(sql`
    SELECT id, name
    FROM words
    WHERE ${parsedInput.wordId !== undefined ? sql`id = ${parsedInput.wordId}` : sql`name ILIKE ${parsedInput.word}`}
    ORDER BY
      CASE
        WHEN ${parsedInput.word !== undefined ? sql`name = ${parsedInput.word}` : sql`TRUE`} THEN 0
        ELSE 1
      END,
      name
    LIMIT 1
  `) as CenterWordRow[];

  const center = centerRows[0];
  if (!center) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Word not found.",
    });
  }

  const firstHopRows = await fetchGraphEdges(db, {
    frontierIds: [center.id],
    includeWordRelations,
    includePhraseRelations,
    wordRelationTypes,
    limit: GRAPH_EDGE_SCAN_LIMIT,
  });

  const firstHopNeighborIds = Array.from(
    new Set(
      firstHopRows.flatMap((row) => [row.sourceId, row.targetId]).filter((id) => id !== center.id),
    ),
  ).slice(0, GRAPH_NODE_LIMIT);

  const secondHopRows =
    parsedInput.depth === 2 && firstHopNeighborIds.length > 0
      ? await fetchGraphEdges(db, {
        frontierIds: firstHopNeighborIds,
        includeWordRelations,
        includePhraseRelations,
        wordRelationTypes,
        limit: Math.max(GRAPH_EDGE_SCAN_LIMIT - firstHopRows.length, 0),
      })
      : [];

  const graphRows = [...firstHopRows, ...secondHopRows].slice(0, GRAPH_EDGE_SCAN_LIMIT);

  return normalizeWordGraphRows(center, graphRows, {
    nodeLimit: GRAPH_NODE_LIMIT,
    edgeScanLimit: GRAPH_EDGE_SCAN_LIMIT,
  });
}

async function fetchGraphEdges(
  db: GraphDb,
  input: {
    frontierIds: number[];
    includeWordRelations: boolean;
    includePhraseRelations: boolean;
    wordRelationTypes: string[];
    limit: number;
  },
) {
  if (input.frontierIds.length === 0 || input.limit <= 0) {
    return [];
  }

  const frontierIdsSql = toPgArray(input.frontierIds, "int");
  const relationFilterSql =
    input.wordRelationTypes.length === 0
      ? sql`TRUE`
      : sql`rw.relation_type = ANY(${toPgArray(input.wordRelationTypes, "text")})`;

  return await db.execute(sql`
    SELECT DISTINCT ON (edge_rows.source_id, edge_rows.target_id, edge_rows.relation_type, edge_rows.source_table)
      edge_rows.source_id AS "sourceId",
      source_word.name AS "sourceName",
      edge_rows.target_id AS "targetId",
      target_word.name AS "targetName",
      edge_rows.relation_type AS "relationType",
      edge_rows.direction AS "direction",
      edge_rows.source_table AS "sourceTable"
    FROM (
      SELECT
        rw.word_id AS source_id,
        rw.related_word_id AS target_id,
        COALESCE(rw.relation_type, 'relatedWord') AS relation_type,
        CASE WHEN rw.word_id = ANY(${frontierIdsSql}) THEN 'outgoing' ELSE 'incoming' END AS direction,
        'related_words'::text AS source_table
      FROM related_words rw
      WHERE
        ${input.includeWordRelations}
        AND (rw.word_id = ANY(${frontierIdsSql}) OR rw.related_word_id = ANY(${frontierIdsSql}))
        AND ${relationFilterSql}

      UNION ALL

      SELECT
        rp.phrase_id AS source_id,
        rp.related_phrase_id AS target_id,
        ${PHRASE_RELATION_TYPE} AS relation_type,
        CASE WHEN rp.phrase_id = ANY(${frontierIdsSql}) THEN 'outgoing' ELSE 'incoming' END AS direction,
        'related_phrases'::text AS source_table
      FROM related_phrases rp
      WHERE
        ${input.includePhraseRelations}
        AND (rp.phrase_id = ANY(${frontierIdsSql}) OR rp.related_phrase_id = ANY(${frontierIdsSql}))
    ) edge_rows
    JOIN words source_word ON source_word.id = edge_rows.source_id
    JOIN words target_word ON target_word.id = edge_rows.target_id
    ORDER BY edge_rows.source_id, edge_rows.target_id, edge_rows.relation_type, edge_rows.source_table
    LIMIT ${input.limit}
  `) as GraphEdgeRow[];
}

export function normalizeWordGraphRows(
  center: CenterWordRow,
  rows: GraphEdgeRow[],
  limits: { nodeLimit?: number; edgeScanLimit?: number } = {},
): WordGraphResult {
  const nodeLimit = limits.nodeLimit ?? GRAPH_NODE_LIMIT;
  const edgeScanLimit = limits.edgeScanLimit ?? GRAPH_EDGE_SCAN_LIMIT;
  const nodes = new Map<number, WordGraphNode>();
  const edges = new Map<string, WordGraphEdge>();

  nodes.set(center.id, {
    id: center.id,
    name: center.name,
    kind: "center",
  });

  for (const row of rows) {
    const relationType = row.relationType ?? "relatedWord";
    const edgeId = `${row.sourceTable}:${row.sourceId}:${row.targetId}:${relationType}`;

    if (!nodes.has(row.sourceId)) {
      nodes.set(row.sourceId, {
        id: row.sourceId,
        name: row.sourceName,
        kind: row.sourceTable === "related_phrases" ? "phrase" : "word",
      });
    }

    if (!nodes.has(row.targetId)) {
      nodes.set(row.targetId, {
        id: row.targetId,
        name: row.targetName,
        kind: row.sourceTable === "related_phrases" ? "phrase" : "word",
      });
    }

    if (!edges.has(edgeId)) {
      edges.set(edgeId, {
        id: edgeId,
        sourceId: row.sourceId,
        targetId: row.targetId,
        relationType,
        direction: row.direction,
        sourceTable: row.sourceTable,
      });
    }
  }

  const allNodes = Array.from(nodes.values());
  const visibleNodeIds = new Set(allNodes.slice(0, nodeLimit).map((node) => node.id));
  const visibleEdges = Array.from(edges.values()).filter(
    (edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId),
  );

  return {
    centerNodeId: center.id,
    nodes: allNodes.slice(0, nodeLimit),
    edges: visibleEdges,
    truncated: allNodes.length > nodeLimit || rows.length >= edgeScanLimit,
  };
}

function normalizeRelationTypes(relationTypes: string[]) {
  return Array.from(new Set(relationTypes.flatMap(expandRelationType).map((type) => type.trim()).filter(Boolean))).slice(0, 16);
}

function expandRelationType(relationType: string) {
  switch (relationType) {
    case "compound":
      return ["compound", "compoundWord"];
    case "see_also":
      return ["see_also", "seeAlso"];
    case "turkish_equivalent":
      return ["turkish_equivalent", "turkishEquivalent"];
    default:
      return [relationType];
  }
}

function toPgArray(values: (number | string)[], type: "int" | "text") {
  if (values.length === 0) {
    return type === "int" ? sql`ARRAY[]::int[]` : sql`ARRAY[]::text[]`;
  }

  return type === "int"
    ? sql`ARRAY[${sql.join(values.map((value) => sql`${value}`), sql`, `)}]::int[]`
    : sql`ARRAY[${sql.join(values.map((value) => sql`${value}`), sql`, `)}]::text[]`;
}
