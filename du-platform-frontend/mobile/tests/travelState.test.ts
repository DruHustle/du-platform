import { describe, expect, it } from "vitest";
import { defaultNativeSearch, normalizedNativeSearch, savedSearchDestination, type SavedTravel } from "../src/travelState";
import { latestRequest } from "../src/requestLifecycle";

function savedSearch(): SavedTravel {
  const search = defaultNativeSearch();
  return { id: "saved-1", name: "Cape Town stay", kind: "search", draft: {
    // The draft can contain edits made after the search was saved.
    criteria: { ...search.criteria, destination: "JNB" },
    searches: [{ category: "stays", criteria: { ...search.criteria, destination: "CPT" } }],
  } };
}

describe("saved native Travel searches", () => {
  it("restores the saved category and exact search snapshot instead of a draft's later edits", () => {
    const saved = savedSearch();
    const target = savedSearchDestination(saved);
    expect(target.kind).toBe("native");
    if (target.kind !== "native") throw new Error("Compatible search was not restored");
    expect(normalizedNativeSearch(target.search)).toEqual(saved.draft.searches![0]);
    expect(target.search.category).toBe("stays");
    expect(target.search.criteria.destination).toBe("CPT");
    target.search.criteria.destination = "HRE";
    expect(saved.draft.searches![0].criteria.destination).toBe("CPT");
  });

  it.each([
    { adults: 2 }, { childAges: [4] }, { rooms: 2 }, { currency: "USD" },
    { tripType: "one-way", returnDate: "" }, { guestNationality: "ZW" }, { flightFlexDays: 3 },
  ])("keeps unsupported saved criteria on the website without silently changing them: %j", changes => {
    const saved = savedSearch();
    Object.assign(saved.draft.searches![0].criteria, changes);
    const original = JSON.stringify(saved);
    expect(savedSearchDestination(saved)).toMatchObject({ kind: "website", path: "/travel/my-trips" });
    expect(JSON.stringify(saved)).toBe(original);
  });

  it("does not collapse a complete trip, multi-category search or legacy incomplete save into one search", () => {
    for (const variation of ["trip", "multiple", "legacy", "car-hire"]) {
      const saved = savedSearch();
      if (variation === "trip") saved.kind = "trip";
      if (variation === "multiple") saved.draft.searches!.push(defaultNativeSearch());
      if (variation === "legacy") delete saved.draft.searches;
      if (variation === "car-hire") saved.draft.searches![0].category = "car-hire";
      expect(savedSearchDestination(saved).kind).toBe("website");
    }
  });
});

describe("Travel reads while the form changes", () => {
  it("ignores a late old search without clearing the new request's loading state", async () => {
    const requests = latestRequest();
    const commits: string[] = [];
    let finishOld!: (value: string) => void;
    let finishNew!: (value: string) => void;
    let busy = true;
    const oldTicket = requests.begin();
    const oldRead = new Promise<string>(resolve => { finishOld = resolve; }).then(value => {
      if (oldTicket.isCurrent()) { commits.push(value); busy = false; }
    });
    // Typing new dates/destination, loading a saved search or changing tab all
    // invalidate the same gate, including transports that resolve after abort.
    requests.invalidate();
    const newTicket = requests.begin();
    const newRead = new Promise<string>(resolve => { finishNew = resolve; }).then(value => {
      if (newTicket.isCurrent()) { commits.push(value); busy = false; }
    });
    finishOld("Harare results"); await oldRead;
    expect(oldTicket.signal.aborted).toBe(true);
    expect(commits).toEqual([]);
    expect(busy).toBe(true);
    finishNew("Cape Town results"); await newRead;
    expect(commits).toEqual(["Cape Town results"]);
    expect(busy).toBe(false);
  });

  it("invalidates a checked provider link when its criteria change or the screen unmounts", () => {
    const requests = latestRequest();
    const revalidation = requests.begin();
    expect(revalidation.isCurrent()).toBe(true);
    requests.invalidate();
    expect(revalidation.signal.aborted).toBe(true);
    expect(revalidation.isCurrent()).toBe(false);
  });
});
