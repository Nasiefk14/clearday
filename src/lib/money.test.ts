import { describe, expect, it } from "vitest";
import { parseMoney, toCents, toDecimalString } from "./money";

describe("parseMoney", () => {
  it("accepts plain and formatted amounts", () => {
    expect(parseMoney("1500")).toBe(150_000);
    expect(parseMoney("R 1,500.50")).toBe(150_050);
    expect(parseMoney("18 500")).toBe(1_850_000);
    expect(parseMoney("0.1")).toBe(10);
  });
  it("rejects junk, negatives and absurd amounts", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("-5")).toBeNull();
    expect(parseMoney("1.234")).toBeNull();
    expect(parseMoney("99999999999")).toBeNull();
  });
});

describe("cents <-> decimal", () => {
  it("round-trips without float drift", () => {
    expect(toCents("0.30")).toBe(30);
    expect(toCents("14200.10")).toBe(1_420_010);
    expect(toDecimalString(1_420_010)).toBe("14200.10");
    expect(toDecimalString(5)).toBe("0.05");
  });
});
