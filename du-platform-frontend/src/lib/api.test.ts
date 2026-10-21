import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./api";
describe("user-facing API failure messages", () => {
  it("gives recoverable feedback for timeouts and offline requests", () => {
    for (const code of ["ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK"])
      expect(
        getApiErrorMessage(
          { code, message: "Internal network detail" },
          "Please try again."
        )
      ).toBe("Please try again.");
  });
  it("preserves actionable server errors instead of generic transport messages", () => {
    expect(
      getApiErrorMessage(
        {
          message: "Request failed with status 400",
          response: { data: { error: { message: "Insufficient stock." } } },
        },
        "Please try again."
      )
    ).toBe("Insufficient stock.");
  });
});
