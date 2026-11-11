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
    ["cheap flights", "/travel/flights"],
    ["cheap flights to Harare", "/travel/flights"],
    ["flight to Harare", "/travel/flights"],
    ["hotels", "/travel/stays"],
    ["Hotels in Windhoek?", "/travel/stays"],
    ["hotel in Harare", "/travel/stays"],
    ["I need a rental car", "/travel/car-hire"],
    ["CAR-HIRE", "/travel/car-hire"],
    ["saved searches", "/travel/my-trips"],
    ["weather forecast", "/travel/weather"],
    ["places to visit", "/travel/explore"],
    ["trip planner", "/travel/planner"],
    ["fluge", "/travel/flights"],
    ["Pekugara", "/travel/stays"],
    ["Ukuqhatsha   imota", "/travel/car-hire"],
    ["Wetter in Kapstadt", "/travel/weather"],
  ])("finds the public journey for %s", async (query, href) => {
    const result = await new SearchService(repository as any).search(query);
    expect(result.results).toContainEqual(expect.objectContaining({ href }));
  });

  it("does not return every route for separator-only input", async () => {
    const result = await new SearchService(repository as any).search("---");
    expect(result.results).toEqual([]);
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

it("keeps indexed routes available during a directory and catalogue outage", async () => {
  const offline = async () => { throw new Error("offline"); };
  const service = new SearchService({ searchNtir: offline, publishedProducts: offline });
  const match = await service.search("shopping");
  expect(match.partial).toBe(true);
  expect(match.results).toContainEqual(expect.objectContaining({ href: "/shop" }));
  await expect(service.search("unmatched")).rejects.toThrow("offline");
});

it("keeps directory matches when the catalogue fails", async () => {
  const service = new SearchService({
    searchNtir: async () => [{ name: "Sample Co", sector: "Crafts", location: "Harare" }],
    publishedProducts: async () => { throw new Error("catalogue unavailable"); },
  } as any);
  const result = await service.search("sample");
  expect(result).toMatchObject({
    partial: true, count: 1, results: [{ href: "/ntir?q=Sample%20Co" }],
  });
});
