import { describe, expect, it } from "vitest";
import { isAllowed } from "./access";

describe("isAllowed", () => {
  const list = " Me@Gmail.com, friend@example.com ,";
  it("matches case-insensitively and ignores spaces", () => {
    expect(isAllowed("me@gmail.com", list)).toBe(true);
    expect(isAllowed("FRIEND@example.com", list)).toBe(true);
  });
  it("rejects everyone else, empty emails and an empty list", () => {
    expect(isAllowed("stranger@gmail.com", list)).toBe(false);
    expect(isAllowed("", list)).toBe(false);
    expect(isAllowed(null, list)).toBe(false);
    expect(isAllowed("me@gmail.com", "")).toBe(false);
  });
});
