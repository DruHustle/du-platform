import { SearchRepository } from "../repositories/searchRepository";

const ROUTE_INDEX = [
  {
    title: "Trade",
    href: "/trade",
    category: "Trade",
    tags: ["export", "germany", "market", "trade", "business", "commerce", "sectors"],
  },
  {
    title: "Tourism",
    href: "/tourism",
    category: "Tourism",
    tags: ["visit", "travel", "attractions", "victoria falls"],
  },
  {
    title: "Investment",
    href: "/investment",
    category: "Investment",
    tags: ["money", "capital", "projects", "masuwe", "sez"],
  },
  {
    title: "Care",
    href: "/care",
    category: "Care",
    tags: ["funeral", "policy", "nyaradzo", "family", "cover"],
  },
  {
    title: "Technology",
    href: "/technology",
    category: "Technology",
    tags: ["ai", "onesa", "innovation", "tech"],
  },
  {
    title: "Impact",
    href: "/impact",
    category: "Impact",
    tags: ["stories", "impact", "cases"],
  },
  {
    title: "NTIR Database",
    href: "/ntir",
    category: "Trade",
    tags: ["register", "ntir", "verification"],
  },
  {
    title: "Regulations",
    href: "/regulations",
    category: "Compliance",
    tags: ["regulation", "compliance", "licensing"],
  },
];

export class SearchService {
  constructor(private readonly repository = new SearchRepository()) {}

  async search(query: string) {
    const normalizedQuery = String(query ?? "").trim().toLowerCase();
    if (!normalizedQuery) {
      return { query: "", count: 0, results: [] };
    }

    const routeMatches = ROUTE_INDEX.filter((item) =>
      [item.title, item.category, ...item.tags].some((value) =>
        String(value).toLowerCase().includes(normalizedQuery)
      )
    );
    const ntirMatches = (await this.repository.searchNtir(normalizedQuery)).slice(0, 10).map((row: any) => ({
      title: row.name,
      href: "/ntir",
      category: "NTIR",
      summary: `${row.sector} - ${row.location}`,
    }));
    const storyMatches = (await this.repository.listStories())
      .filter((story: any) =>
        [story.title, story.category, story.story, story.author].some((value) =>
          String(value ?? "").toLowerCase().includes(normalizedQuery)
        )
      )
      .slice(0, 10)
      .map((story: any) => ({
        title: story.title,
        href: "/impact",
        category: story.category || "Impact",
        summary: String(story.story ?? "").slice(0, 140),
      }));

    const results = [...routeMatches, ...ntirMatches, ...storyMatches];
    return {
      query: normalizedQuery,
      count: results.length,
      results,
    };
  }
}
