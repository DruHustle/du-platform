import { describe, expect, it } from "vitest";
import { SearchService } from "../services/searchService";

describe("search service route index", () => {
  const repository = {
    searchNtir: async () => [],
  };

  it("does not return removed or unavailable application routes", async () => {
    const service = new SearchService(repository as any);

    for (const query of ["care", "trade", "impact"]) {
      const result = await service.search(query);
      expect(result.results).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ href: expect.stringMatching(/^\/(care|trade|impact)$/) }),
        ]),
      );
    }
  });
});
