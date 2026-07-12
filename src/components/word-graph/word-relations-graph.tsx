"use client";

import {
  Background,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { Chip, Spinner } from "@heroui/react";
import { GitBranch, Maximize2, Minimize2, Network } from "lucide-react";
import { useTranslations } from "next-intl";
import { type CSSProperties, type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useRouter } from "@/src/i18n/routing";
import { api, type RouterOutputs } from "@/src/trpc/react";

type GraphData = RouterOutputs["wordGraph"]["getNeighborhood"];
type GraphNode = GraphData["nodes"][number];
type GraphEdge = GraphData["edges"][number];
type WordGraphFlowNode = Node<{
  label: ReactNode;
  kind: GraphNode["kind"];
  word: string;
}>;

type WordRelationsGraphProps = {
  wordId?: number;
  word?: string;
  title?: string;
  compact?: boolean;
  className?: string;
};

const RELATION_FILTERS = [
  "relatedWord",
  "synonym",
  "antonym",
  "correction",
  "compound",
  "see_also",
  "turkish_equivalent",
  "obsolete",
  "phrase",
] as const;

const EDGE_COLORS: Record<string, string> = {
  relatedWord: "#71717a",
  synonym: "#15803d",
  antonym: "#b91c1c",
  correction: "#0369a1",
  compound: "#7c3aed",
  compoundWord: "#7c3aed",
  see_also: "#a16207",
  seeAlso: "#a16207",
  turkish_equivalent: "#be123c",
  turkishEquivalent: "#be123c",
  obsolete: "#52525b",
  phrase: "#0f766e",
};

const RELATION_TRANSLATION_KEYS: Record<string, string> = {
  relatedword: "relatedWord",
  related: "relatedWord",
  ilgilikelime: "relatedWord",
  synonym: "synonym",
  esanlam: "synonym",
  antonym: "antonym",
  zitanlam: "antonym",
  correction: "correction",
  duzeltme: "correction",
  compound: "compound",
  compoundword: "compound",
  bilesik: "compound",
  bilesikkelime: "compound",
  seealso: "seeAlso",
  ayricabakiniz: "seeAlso",
  turkishequivalent: "turkishEquivalent",
  turkcekarsiligi: "turkishEquivalent",
  obsolete: "obsolete",
  eskimis: "obsolete",
  phrase: "phrase",
  deyim: "phrase",
};

const graphControlsStyle = {
  "--xy-controls-button-background-color": "hsl(var(--background))",
  "--xy-controls-button-background-color-hover": "hsl(var(--accent))",
  "--xy-controls-button-color": "hsl(var(--foreground))",
  "--xy-controls-button-color-hover": "hsl(var(--accent-foreground))",
  "--xy-controls-button-border-color": "hsl(var(--border))",
  "--xy-controls-box-shadow": "0 10px 20px rgb(0 0 0 / 0.12)",
} as CSSProperties;

export default function WordRelationsGraph({
  wordId,
  word,
  title,
  compact = false,
  className,
}: WordRelationsGraphProps) {
  const t = useTranslations("WordGraph");
  const router = useRouter();
  const [depth, setDepth] = useState<1 | 2>(1);
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<string[]>([]);
  const [hasRequestedGraph, setHasRequestedGraph] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  const graphQuery = api.wordGraph.getNeighborhood.useQuery(
    {
      wordId,
      word,
      depth,
      relationTypes: selectedRelationTypes,
      includePhrases: true,
    },
    {
      enabled: Boolean(wordId || word) && hasRequestedGraph,
      staleTime: 60_000,
    },
  );

  const graph = graphQuery.data;
  const { nodes, edges } = useGraphElements(graph, t, isFullscreen);

  const handleNodeClick = useCallback(
    (_: MouseEvent, node: WordGraphFlowNode) => {
      if (node.data.kind === "phrase") {
        return;
      }

      router.push({
        pathname: "/search/[word]",
        params: { word: node.data.word },
      });
    },
    [router],
  );

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") {
      setIsFullscreen((current) => !current);
      return;
    }

    if (isFullscreen) {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      setIsFullscreen(false);
      return;
    }

    const section = sectionRef.current;

    if (section?.requestFullscreen && document.fullscreenEnabled) {
      await section.requestFullscreen().catch(() => undefined);
    }

    setIsFullscreen(true);
  }, [isFullscreen]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen || typeof document === "undefined" || document.fullscreenElement) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleRelationType = (relationType: string) => {
    setSelectedRelationTypes((current) =>
      current.includes(relationType)
        ? current.filter((type) => type !== relationType)
        : [...current, relationType],
    );
  };

  return (
    <section
      ref={sectionRef}
      className={cn(
        isFullscreen
          ? "fixed inset-0 z-[9999] flex h-dvh flex-col gap-4 overflow-hidden border-0 bg-background p-4 sm:p-6"
          : "space-y-4 border border-border/70 bg-background/40 p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" aria-hidden />
            <h2 className={cn("font-semibold text-foreground", compact ? "text-base" : "text-lg")}>
              {title ?? t("title")}
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-border/70 bg-background/70 p-1">
            {[1, 2].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={depth === value}
                onClick={() => setDepth(value as 1 | 2)}
                className={cn(
                  "min-h-8 rounded-sm px-3 text-sm font-medium transition-colors",
                  depth === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {t("depth", { depth: value })}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
            <span>{isFullscreen ? t("exitFullscreen") : t("fullscreen")}</span>
          </button>
          {!hasRequestedGraph ? (
            <button
              type="button"
              onClick={() => setHasRequestedGraph(true)}
              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Network className="h-4 w-4" aria-hidden />
              {t("loadGraph")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {RELATION_FILTERS.map((relationType) => {
          const selected = selectedRelationTypes.includes(relationType);

          return (
            <button
              key={relationType}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleRelationType(relationType)}
              className={cn(
                "min-h-8 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                selected
                  ? "border-primary/70 bg-primary/10 text-primary"
                  : "border-border/70 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              {getRelationLabel(relationType, t)}
            </button>
          );
        })}
        {selectedRelationTypes.length > 0 ? (
          <button
            type="button"
            onClick={() => setSelectedRelationTypes([])}
            className="min-h-8 rounded-md border border-border/70 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-md border border-border/70 bg-background/70",
          isFullscreen ? "min-h-0 flex-1" : compact ? "h-80" : "h-[34rem]",
        )}
      >
        {!hasRequestedGraph ? (
          <GraphPlaceholder onLoad={() => setHasRequestedGraph(true)} />
        ) : graphQuery.isLoading ? (
          <GraphState>
            <Spinner size="sm" />
            <span>{t("loading")}</span>
          </GraphState>
        ) : graphQuery.isError ? (
          <GraphState>
            <span>{t("error")}</span>
          </GraphState>
        ) : graph && graph.nodes.length <= 1 && graph.edges.length === 0 ? (
          <GraphState>
            <GitBranch className="h-5 w-5 text-muted-foreground" aria-hidden />
            <span>{t("empty")}</span>
          </GraphState>
        ) : graph ? (
          <ReactFlow
            key={isFullscreen ? "word-graph-fullscreen" : "word-graph-inline"}
            style={graphControlsStyle}
            nodes={nodes}
            edges={edges}
            fitView
            minZoom={0.08}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            onNodeClick={handleNodeClick}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={22} color="hsl(var(--border))" />
            <Controls showInteractive={false} />
            <Panel position="top-left">
              <div className="rounded-md border border-border/70 bg-background/90 px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm">
                {t("counts", { nodes: graph.nodes.length, edges: graph.edges.length })}
              </div>
            </Panel>
            {graph.truncated ? (
              <Panel position="bottom-left">
                <div className="max-w-72 rounded-md border border-primary/30 bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
                  {t("truncated")}
                </div>
              </Panel>
            ) : null}
          </ReactFlow>
        ) : null}
      </div>
    </section>
  );
}

function GraphPlaceholder({ onLoad }: { onLoad: () => void }) {
  const t = useTranslations("WordGraph");
  const previewNodes = [
    { label: t("nodeKinds.center"), x: "48%", y: "46%", tone: "center" },
    { label: t("relations.synonym"), x: "25%", y: "24%", tone: "word" },
    { label: t("relations.relatedWord"), x: "73%", y: "24%", tone: "word" },
    { label: t("relations.phrase"), x: "28%", y: "72%", tone: "phrase" },
    { label: t("relations.antonym"), x: "76%", y: "70%", tone: "word" },
  ];

  return (
    <div className="absolute inset-0 bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border))_1px,transparent_0)] [background-size:22px_22px]" aria-hidden />
      <div className="absolute inset-0 blur-[2px]" aria-hidden>
        <svg className="absolute inset-0 h-full w-full opacity-55" role="presentation">
          <line x1="50%" y1="50%" x2="25%" y2="24%" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
          <line x1="50%" y1="50%" x2="73%" y2="24%" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
          <line x1="50%" y1="50%" x2="28%" y2="72%" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
          <line x1="50%" y1="50%" x2="76%" y2="70%" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
          <line x1="25%" y1="24%" x2="73%" y2="24%" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/60" />
        </svg>
        {previewNodes.map((node) => (
          <div
            key={`${node.label}-${node.x}-${node.y}`}
            className={cn(
              "absolute min-w-28 -translate-x-1/2 -translate-y-1/2 rounded-md border px-3 py-2 text-center text-sm font-medium shadow-sm",
              node.tone === "center"
                ? "border-primary/60 bg-primary text-primary-foreground"
                : node.tone === "phrase"
                  ? "border-teal-500/30 bg-teal-500/10 text-foreground"
                  : "border-border bg-background text-foreground",
            )}
            style={{ left: node.x, top: node.y }}
          >
            {node.label}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/45 backdrop-blur-[1px]">
        <div className="mx-4 max-w-sm rounded-md border border-border/80 bg-background/95 p-5 text-center shadow-lg shadow-black/10">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Network className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">{t("previewTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("previewDescription")}</p>
          <button
            type="button"
            onClick={onLoad}
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("loadGraph")}
          </button>
        </div>
      </div>
    </div>
  );
}

function GraphState({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function useGraphElements(graph: GraphData | undefined, t: ReturnType<typeof useTranslations>, isFullscreen: boolean) {
  return useMemo(() => {
    if (!graph) {
      return { nodes: [] as WordGraphFlowNode[], edges: [] as Edge[] };
    }

    const center = graph.nodes.find((node) => node.id === graph.centerNodeId);
    const otherNodes = graph.nodes.filter((node) => node.id !== graph.centerNodeId);
    const isDense = graph.nodes.length > 24;

    const nodes: WordGraphFlowNode[] = graph.nodes.map((node, index) => {
      const position = getNodePosition(node, center, otherNodes, index, {
        isDense,
        isFullscreen,
      });

      return {
        id: String(node.id),
        data: {
          label: (
            <div className="max-w-36 truncate">
              <span>{node.name}</span>
              {node.kind === "phrase" ? (
                <Chip size="sm" variant="flat" color="default" className="ml-1 scale-90">
                  {t(`nodeKinds.${node.kind}`)}
                </Chip>
              ) : null}
            </div>
          ),
          kind: node.kind,
          word: node.name,
        },
        position,
        className: cn(
          "!rounded-md !border !px-3 !py-2 !text-sm !shadow-sm",
          node.kind === "center"
            ? "!cursor-pointer !border-primary/70 !bg-primary !text-primary-foreground"
            : node.kind === "phrase"
              ? "!border-teal-500/40 !bg-teal-500/10 !text-foreground"
              : "!cursor-pointer !border-border/80 !bg-background !text-foreground",
        ),
      };
    });

    const edges: Edge[] = graph.edges.map((edge) => {
      const showLabel = shouldShowEdgeLabel(edge, graph.edges.length);
      const relationColor = getRelationColor(edge.relationType);

      return {
        id: edge.id,
        source: String(edge.sourceId),
        target: String(edge.targetId),
        label: showLabel ? getRelationLabel(edge.relationType, t) : undefined,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: relationColor,
        },
        style: {
          stroke: relationColor,
          strokeWidth: edge.sourceTable === "related_phrases" ? 1.35 : 1.8,
          opacity: isDense && getRelationTranslationKey(edge.relationType) === "relatedWord" ? 0.55 : 0.8,
        },
        labelStyle: {
          fill: "hsl(var(--muted-foreground))",
          fontSize: 11,
          fontWeight: 600,
        },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
        labelBgStyle: {
          fill: "hsl(var(--background))",
          fillOpacity: 0.92,
        },
      };
    });

    return { nodes, edges };
  }, [graph, isFullscreen, t]);
}

function getNodePosition(
  node: GraphNode,
  center: GraphNode | undefined,
  otherNodes: GraphNode[],
  fallbackIndex: number,
  options: {
    isDense: boolean;
    isFullscreen: boolean;
  },
) {
  if (center && node.id === center.id) {
    return { x: 0, y: 0 };
  }

  const index = Math.max(otherNodes.findIndex((item) => item.id === node.id), fallbackIndex);
  const ringSize = options.isDense ? 18 : 12;
  const ringIndex = Math.floor(index / ringSize);
  const indexInRing = index % ringSize;
  const nodesInRing = Math.min(ringSize, otherNodes.length - ringIndex * ringSize);
  const radius = (options.isDense ? 420 : 300) + ringIndex * (options.isFullscreen ? 360 : 300);
  const angleOffset = ringIndex % 2 === 0 ? -Math.PI / 2 : -Math.PI / 2 + Math.PI / Math.max(nodesInRing, 1);
  const angle = (indexInRing / Math.max(nodesInRing, 1)) * Math.PI * 2 + angleOffset;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function shouldShowEdgeLabel(edge: GraphEdge, edgeCount: number) {
  const translationKey = getRelationTranslationKey(edge.relationType);

  if (edgeCount > 24 && (translationKey === "relatedWord" || translationKey === "phrase")) {
    return false;
  }

  return translationKey !== "relatedWord";
}

function getRelationLabel(relationType: string, t?: ReturnType<typeof useTranslations>) {
  const translationKey = getRelationTranslationKey(relationType);
  if (!translationKey) return relationType;
  if (!t) return translationKey;
  return t(`relations.${translationKey}`);
}

function getRelationColor(relationType: string) {
  const translationKey = getRelationTranslationKey(relationType);

  if (translationKey === "seeAlso") {
    return EDGE_COLORS.see_also;
  }

  if (translationKey === "turkishEquivalent") {
    return EDGE_COLORS.turkish_equivalent;
  }

  return EDGE_COLORS[translationKey ?? relationType] ?? EDGE_COLORS.relatedWord;
}

function getRelationTranslationKey(relationType: string) {
  const normalizedRelationType = normalizeRelationType(relationType);

  return RELATION_TRANSLATION_KEYS[normalizedRelationType];
}

function normalizeRelationType(relationType: string) {
  return relationType
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ıİ]/g, "i")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\s/g, "");
}
