import { describe, it, expect } from "vitest";
import { getApiErrorMessage } from "../lib/api-errors";

describe("API error responses", () => {
  it("does not expose database error details", async () => {
    expect(getApiErrorMessage(500, 'column "notification_prefs" does not exist')).toBe("Internal server error");
  });
});