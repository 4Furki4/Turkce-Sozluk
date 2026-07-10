"use client";

import { useEffect } from "react";
import { createWebMcpTools, type WebMcpTool } from "./webmcp-tools";

type WebMcpContext = {
  registerTool?: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<void> | void;
  provideContext?: (
    context: { tools: WebMcpTool[] } | WebMcpTool[],
    options?: { signal?: AbortSignal },
  ) => Promise<void> | void;
};

declare global {
  interface Document {
    modelContext?: WebMcpContext;
  }

  interface Navigator {
    modelContext?: WebMcpContext;
  }
}

function getModelContext(): WebMcpContext | undefined {
  return document.modelContext ?? navigator.modelContext;
}

async function registerWebMcpTools(context: WebMcpContext, tools: WebMcpTool[], signal: AbortSignal) {
  if (typeof context.registerTool === "function") {
    await Promise.all(tools.map((tool) => context.registerTool?.(tool, { signal })));
    return;
  }

  if (typeof context.provideContext === "function") {
    await context.provideContext({ tools }, { signal });
  }
}

export default function WebMcpRegistrar() {
  useEffect(() => {
    const context = getModelContext();
    if (!context) {
      return;
    }

    const abortController = new AbortController();
    const tools = createWebMcpTools({
      location: window.location,
      document,
    });

    registerWebMcpTools(context, tools, abortController.signal).catch((error) => {
      console.warn("[WebMCP] Failed to register tools", error);
    });

    return () => {
      abortController.abort();
    };
  }, []);

  return null;
}
