import { describe, expect, it } from "vitest";
import { SearchService } from "../services/searchService";

describe("search service route index", () => {
  const repository = {
    searchNtir: async () => [],
  };

  it.each([
    ["shopping", "/shop"],
    ["assistant", "/onesa-ai-chat"],
  ])("finds the public journey for %s", async (query, href) => {
    const result = await new SearchService(repository as any).search(query);
    expect(result.results).toContainEqual(expect.objectContaining({ href }));
  });

  it("does not return removed or unavailable application routes", async () => {
    const service = new SearchService(repository as any);

    for (const query of [
      "care",
      "trade",
      "impact",
      "remittances",
      "send money",
      "airtime",
    ]) {
      const result = await service.search(query);
      expect(result.results).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            href: expect.stringMatching(/^\/(care|trade|impact|remittances)$/),
          }),
        ])
      );
    }
  });
});
