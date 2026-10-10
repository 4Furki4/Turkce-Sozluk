"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { GoogleReCaptchaContext } from "react-google-recaptcha-v3";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/src/trpc/react";
import RequestsList from "@/src/_pages/requests/requests-list";
import RequestDetail from "@/src/_pages/requests/request-detail";
import { fixtureStates, getFixtureRequests, longWord, type FixtureState } from "./requests-fixtures";

function FixtureBoundary({ state, children }: { state: FixtureState; children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }));
  const [client] = useState(() => api.createClient({ links: [() => ({ op }) => observable(observer => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const input = (op.input ?? {}) as Record<string, any>;
      if ((state === "error" || state === "missing") && op.path.startsWith("request.getUser")) {
        observer.error(TRPCClientError.from({ error: { message: "Fixture unavailable", code: -32004, data: { code: state === "missing" ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR", httpStatus: state === "missing" ? 404 : 500 } } }));
        return;
      }
      if (op.type === "mutation") {
        observer.error(new TRPCClientError("Fixture cancellation failed"));
        return;
      }
      const rows = getFixtureRequests(state);
      let data: unknown = [];
      if (op.path === "request.getUserRequests") {
        const matching = rows.filter(row => (!input.entityType || row.entityType === input.entityType) && (!input.action || row.action === input.action) && (!input.status || row.status === input.status));
        const page = input.page ?? 1, limit = input.limit ?? 10;
        data = { requests: matching.slice((page - 1) * limit, page * limit), pagination: { currentPage: page, totalCount: matching.length, totalPages: Math.ceil(matching.length / limit), hasPreviousPage: page > 1, hasNextPage: page < Math.ceil(matching.length / limit) } };
      } else if (op.path === "request.getUserRequest") {
        const request = rows.find(row => row.id === input.requestId);
        if (!request) {
          observer.error(TRPCClientError.from({ error: { message: "Fixture request not found", code: -32004, data: { code: "NOT_FOUND", httpStatus: 404 } } }));
          return;
        }
        const entityData = request.entityType === "meanings" ? { id: 1, meaning: "Eski anlam" }
          : request.entityId && (request.entityType === "words" || request.entityType === "pronunciations") ? { id: request.entityId, name: "kitap" } : null;
        data = { request, entityData };
      } else if (op.path === "word.getWordById") {
        data = { id: input.id, name: state === "worst" ? longWord : "kitap" };
      } else if (op.path === "word.getWordsByIds") {
        data = [];
      }
      observer.next({ result: { data } });
      observer.complete();
    }, state === "loading" ? 600_000 : 25);
    return () => { cancelled = true; clearTimeout(timer); };
  })] }));
  return <QueryClientProvider client={queryClient}><api.Provider client={client} queryClient={queryClient}>
    <GoogleReCaptchaContext.Provider value={{ executeRecaptcha: async () => "fixture-only-not-transmitted" }}>
      {children}
    </GoogleReCaptchaContext.Provider>
  </api.Provider></QueryClientProvider>;
}

export default function RequestsStressPreview() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = fixtureStates.includes(params.get("data") as FixtureState) ? params.get("data") as FixtureState : "demo";
  const surface = params.get("surface") === "detail" ? "detail" : "list";
  const rows = getFixtureRequests(state);
  const id = Number(params.get("id")) || rows[0]?.id || 1;
  const set = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) next.set(key, value);
    next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  return <>
    <div className="w-full min-w-0 pb-44">
      <FixtureBoundary key={state} state={state}>
        {surface === "list" ? <RequestsList /> : <RequestDetail key={id} requestId={id} />}
      </FixtureBoundary>
    </div>
    <div className="fixed bottom-24 sm:bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 rounded-lg border border-gray-300 bg-gray-100 p-2 text-xs text-gray-900 shadow-md" style={{ fontFamily: "system-ui" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span>UI fixtures · development only</span>
        <button className="rounded bg-white px-3 py-2" aria-pressed={surface === "list"} onClick={() => set({ surface: "list" })}>List</button>
        <button className="rounded bg-white px-3 py-2" aria-pressed={surface === "detail"} onClick={() => set({ surface: "detail" })}>Detail</button>
        {surface === "detail" && <select aria-label="Fixture request" className="max-w-full rounded bg-white p-2" value={id} onChange={e => set({ id: e.target.value })}>{rows.slice(0, 50).map(row => <option key={row.id} value={row.id}>#{row.id} {row.entityType} · {row.action}</option>)}</select>}
      </div>
      <div className="mt-2 flex gap-1 overflow-x-auto" aria-label="Fixture data">
        {fixtureStates.map(value => <button key={value} aria-pressed={state === value} className={`shrink-0 rounded px-3 py-2 ${state === value ? "bg-white shadow-sm" : "bg-transparent"}`} onClick={() => set({ data: value, id: String(getFixtureRequests(value)[0]?.id ?? 1) })}>{value === "demo" ? "Demo data" : value === "worst" ? "Worst case" : value === "large" ? "1,284 requests" : value[0].toUpperCase() + value.slice(1)}</button>)}
      </div>
    </div>
  </>;
}
