import React from "react";
import { render, screen } from "@testing-library/react";
import { DataDisplay } from "../details/DataDisplay";
import { DiffTable } from "../details/DiffTable";
import { CreateAuthor } from "../details/author/create";
import { resolveRequestData } from "../details/useRequestResolver";

jest.mock("next-intl", () => ({
  useLocale: () => "tr",
  useTranslations: (namespace: string) => {
    const messages = require("@/messages/tr.json");
    const get = (key: string) => `${namespace}.${key}`.split('.').reduce((value, part) => value?.[part], messages);
    const t = (key: string) => get(key) ?? key;
    t.has = (key: string) => typeof get(key) === "string";
    return t;
  },
}));
jest.mock("@/src/trpc/react", () => ({ api: {
  request: { getWordAttributesWithRequested: { useQuery: () => ({ data: [], isLoading: false }) }, getMeaningAttributesWithRequested: { useQuery: () => ({ data: [], isLoading: false }) }, getAuthorsWithRequested: { useQuery: () => ({ data: [], isLoading: false }) } },
  params: { getLanguages: { useQuery: () => ({ data: [], isLoading: false }) }, getPartOfSpeeches: { useQuery: () => ({ data: [], isLoading: false }) } },
  word: { getWordsByIds: { useQuery: () => ({ data: [], isLoading: false }) } },
} }));
jest.mock("@heroui/react", () => ({ Spinner: () => <div>Loading</div> }));

it("renders nested object arrays, mixed scripts, nulls, and literal markup without losing content", () => {
  render(<DataDisplay data={{ name: "Aleksandra Wiśniewska-Kowalczyk", meanings: [{ meaning: "中文 العربية 📚 <b>literal</b>" }], language: null }} />);
  expect(screen.getByText("中文 العربية 📚 <b>literal</b>")).toBeInTheDocument();
  expect(screen.getByText("Boş")).toBeInTheDocument();
  expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
});

it("shows unchanged proposed values and localized comparison labels", () => {
  render(<DiffTable oldData={{ name: "Jo", meanings: [{ meaning: "eski" }] }} newData={{ name: "Jo", meanings: [{ meaning: "yeni" }] }} />);
  expect(screen.getAllByText("Jo")).toHaveLength(2);
  expect(screen.getByText("yeni")).toBeInTheDocument();
  expect(screen.getAllByText("Eski Değer").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Yeni Değer").length).toBeGreaterThan(0);
  expect(screen.queryByText("OLD:")).not.toBeInTheDocument();
});

it("contains incomplete author records instead of throwing", () => {
  render(<CreateAuthor newData={{ name: null }} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Şema Doğrulama Hatası");
  expect(screen.getByText("Ham Veriyi Görüntüle")).toBeInTheDocument();
});

it("preserves unresolved languages, IDs, nullable relations, and descriptions", () => {
  const maps = Object.fromEntries(["wordAttrMap", "meaningAttrMap", "posMap", "langMap", "authorMap", "wordNamesMap"].map(key => [key, new Map()]));
  const translate = Object.assign((value: string) => value, { has: () => false });
  const data = { language: "unknown-language", relatedPhrases: [{ relatedWordId: 999999, relationType: null, description: "Kaynak açıklaması" }], meanings: [{ part_of_speech_id: 999999, example: { author_id: 999999 } }] };
  const output = resolveRequestData(data, "words", maps, "tr", translate);
  expect(output.language).toBe("unknown-language");
  expect(output.relatedPhrases[0]).toMatchObject({ relatedWord: "ID: 999999", relationType: null, description: "Kaynak açıklaması" });
  expect(output.meanings[0]).toMatchObject({ partOfSpeech: "ID: 999999", example: { author: "ID: 999999" } });
  expect(data.meanings[0].example).toEqual({ author_id: 999999 });
});
