import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import WordRelationsGraph from "../word-relations-graph";

const mockUseQuery = jest.fn();

jest.mock("@/src/trpc/react", () => ({
  api: {
    wordGraph: {
      getNeighborhood: {
        useQuery: (...args: unknown[]) => mockUseQuery(...args),
      },
    },
  },
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const messages: Record<string, string> = {
      title: "Word graph",
      description: "Explore nearby words.",
      depth: "{depth} hop",
      clearFilters: "Clear filters",
      loading: "Loading word graph...",
      error: "Could not load the word graph.",
      empty: "No graph relations found for this word yet.",
      truncated: "This graph is capped.",
      counts: "{nodes} nodes / {edges} edges",
      centerWord: "Center word",
      openWord: "Open word",
      loadGraph: "Show graph",
      fullscreen: "Full screen",
      exitFullscreen: "Exit full screen",
      previewTitle: "Preview the relation map",
      previewDescription: "Load the interactive graph.",
      "nodeKinds.center": "Center",
      "nodeKinds.word": "Word",
      "nodeKinds.phrase": "Phrase",
      "relations.relatedWord": "Related word",
      "relations.synonym": "Synonym",
      "relations.antonym": "Antonym",
      "relations.correction": "Correction",
      "relations.compound": "Compound",
      "relations.seeAlso": "See also",
      "relations.turkishEquivalent": "Turkish equivalent",
      "relations.obsolete": "Obsolete",
      "relations.phrase": "Phrase",
    };

    let message = messages[key] ?? key;
    Object.entries(values ?? {}).forEach(([name, value]) => {
      message = message.replace(`{${name}}`, String(value));
    });
    return message;
  },
}));

jest.mock("@heroui/react", () => ({
  Button: ({ as: Component = "button", children, onPress, onClick, endContent, ...props }: any) => (
    <Component type={Component === "button" ? "button" : undefined} onClick={onPress ?? onClick} {...props}>
      {children}
      {endContent}
    </Component>
  ),
  Chip: ({ children }: any) => <span>{children}</span>,
  Spinner: () => <span>spinner</span>,
}));

jest.mock("@xyflow/react", () => ({
  Background: () => <div data-testid="graph-background" />,
  Controls: () => <div data-testid="graph-controls" />,
  MarkerType: {
    ArrowClosed: "arrowclosed",
  },
  Panel: ({ children }: any) => <div>{children}</div>,
  ReactFlow: ({ nodes, edges, children }: any) => (
    <div data-testid="react-flow" data-nodes={nodes.length} data-edges={edges.length}>
      {nodes.map((node: any) => (
        <div key={node.id}>{node.data.label}</div>
      ))}
      {edges.map((edge: any) => (
        <div key={edge.id}>{edge.label}</div>
      ))}
      {children}
    </div>
  ),
}));

jest.mock("@/src/i18n/routing", () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={typeof href === "string" ? href : `/search/${href.params.word}`} {...props}>
      {children}
    </a>
  ),
}));

const graphData = {
  centerNodeId: 1,
  nodes: [
    { id: 1, name: "kitap", kind: "center" as const },
    { id: 2, name: "defter", kind: "word" as const },
  ],
  edges: [
    {
      id: "related_words:1:2:synonym",
      sourceId: 1,
      targetId: 2,
      relationType: "synonym",
      direction: "outgoing" as const,
      sourceTable: "related_words" as const,
    },
  ],
  truncated: false,
};

describe("WordRelationsGraph", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("renders a lazy preview before fetching", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    render(<WordRelationsGraph wordId={1} word="kitap" />);

    expect(screen.getByText("Preview the relation map")).toBeInTheDocument();
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.objectContaining({ enabled: false }),
    );
  });

  it("renders a loading state after demand loading starts", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<WordRelationsGraph wordId={1} word="kitap" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Show graph" })[0]);

    expect(screen.getByText("Loading word graph...")).toBeInTheDocument();
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.objectContaining({ enabled: true }),
    );
  });

  it("renders an empty graph state", () => {
    mockUseQuery.mockReturnValue({
      data: {
        centerNodeId: 1,
        nodes: [{ id: 1, name: "kitap", kind: "center" }],
        edges: [],
        truncated: false,
      },
      isLoading: false,
      isError: false,
    });

    render(<WordRelationsGraph wordId={1} word="kitap" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Show graph" })[0]);

    expect(screen.getByText("No graph relations found for this word yet.")).toBeInTheDocument();
  });

  it("renders graph nodes, counts, and truncation notice", () => {
    mockUseQuery.mockReturnValue({
      data: {
        ...graphData,
        truncated: true,
      },
      isLoading: false,
      isError: false,
    });

    render(<WordRelationsGraph wordId={1} word="kitap" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Show graph" })[0]);

    expect(screen.getByTestId("react-flow")).toHaveAttribute("data-nodes", "2");
    expect(screen.getAllByText("kitap").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Synonym").length).toBeGreaterThan(0);
    expect(screen.getByText("2 nodes / 1 edges")).toBeInTheDocument();
    expect(screen.getByText("This graph is capped.")).toBeInTheDocument();
  });

  it("localizes non-canonical relation type labels", () => {
    mockUseQuery.mockReturnValue({
      data: {
        ...graphData,
        edges: [
          {
            ...graphData.edges[0],
            id: "related_words:1:2:Turkish Equivalent",
            relationType: "Turkish Equivalent",
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<WordRelationsGraph wordId={1} word="kitap" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Show graph" })[0]);

    expect(screen.getAllByText("Turkish equivalent").length).toBeGreaterThan(0);
    expect(screen.queryByText("Turkish Equivalent")).not.toBeInTheDocument();
  });

  it("updates the query input when relation filters change", () => {
    mockUseQuery.mockReturnValue({
      data: graphData,
      isLoading: false,
      isError: false,
    });

    render(<WordRelationsGraph wordId={1} word="kitap" />);
    fireEvent.click(screen.getByRole("button", { name: "Synonym" }));
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        relationTypes: ["synonym"],
      }),
      expect.objectContaining({
        enabled: false,
      }),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Show graph" })[0]);

    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        relationTypes: ["synonym"],
      }),
      expect.objectContaining({
        enabled: true,
      }),
    );
  });

  it("toggles full screen mode", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    render(<WordRelationsGraph wordId={1} word="kitap" />);
    fireEvent.click(screen.getByRole("button", { name: "Full screen" }));

    expect(screen.getByRole("button", { name: "Exit full screen" })).toBeInTheDocument();
  });
});
