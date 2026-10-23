import { describe, expect, it } from "vitest";
import { SearchService } from "../services/searchService";

describe("search service route index", () => {
  const repository = {
    searchNtir: async () => [],
    publishedProducts: async () => [],
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

it("finds published catalogue descriptions and excludes hidden products", async () => {
  const service = new SearchService({
    searchNtir: async () => [],
    publishedProducts: async () => [
      {
        name: "Mazoe Orange",
        description: "Orange cordial",
        slug: "mazoe-orange",
        is_active: 1,
        stock_qty: 2,
      },
      {
        name: "Hidden Mazoe",
        description: "Private",
        slug: "hidden",
        is_active: 0,
        stock_qty: 5,
      },
    ],
  } as any);
  expect((await service.search("mazoe")).results).toEqual([
    expect.objectContaining({
      title: "Mazoe Orange",
      href: "/shop/products?product=mazoe-orange",
      category: "Product",
    }),
  ]);
  expect((await service.search("cordial")).results).toContainEqual(
    expect.objectContaining({ title: "Mazoe Orange" })
  );
});
it("propagates catalogue failures rather than reporting an empty search", async () => {
  await expect(
    new SearchService({
      searchNtir: async () => [],
      publishedProducts: async () => {
        throw new Error("offline");
      },
    } as any).search("Mazoe")
  ).rejects.toThrow("offline");
});
it("opens the matching directory search instead of an unfiltered directory", async () => {
  const result = await new SearchService({
    searchNtir: async () => [
      { name: "Source & Co", sector: "Crafts", location: "Harare" },
    ],
    publishedProducts: async () => [],
  } as any).search("source");
  expect(result.results).toContainEqual(
    expect.objectContaining({
      href: "/ntir?q=Source%20%26%20Co",
      category: "NTIR",
    })
  );
});
