import { isSitePath } from "./shopDiscovery";

type SearchResult = { title: string; category: string; href: string; summary?: string };
export type SearchResponse = { results: SearchResult[]; partial: boolean };

export function readSearchResponse(data: unknown, previous?: SearchResponse | null): SearchResponse {
  const payload = data as Partial<SearchResponse> | null;
  if (!Array.isArray(payload?.results) || !payload.results.every(item =>
    item && typeof item.title === "string" && typeof item.category === "string" &&
    typeof item.href === "string" && isSitePath(item.href) &&
    (item.summary === undefined || typeof item.summary === "string")
  )) throw new Error("The search response was invalid.");
  const results = [...payload.results];
  if (payload.partial === true && previous) {
    const returned = new Set(results.map(item => item.href));
    results.push(...previous.results.filter(item => !returned.has(item.href)));
  }
  return { partial: payload.partial === true, results };
}
