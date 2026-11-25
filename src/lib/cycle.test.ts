import { describe, expect, it } from "vitest";
import { cycleFor, cycleMonthLabel, cycleRange, dueDateIn, formatCycle, pickCycle, shiftCycle } from "./cycle";

const d = (s: string) => new Date(`${s}T12:00:00Z`);

describe("cycleFor", () => {
  it("is this month's cycle on or after payday", () => {
    expect(cycleFor(d("2026-11-25"), 25)).toBe("2026-11");
    expect(cycleFor(d("2026-12-03"), 25)).toBe("2026-11");
  });
  it("is last month's cycle before payday", () => {
    expect(cycleFor(d("2026-11-24"), 25)).toBe("2026-10");
  });
  it("wraps across the year", () => {
    expect(cycleFor(d("2027-01-10"), 25)).toBe("2026-12");
  });
  it("clamps payday 31 to short months", () => {
    expect(cycleFor(d("2027-02-28"), 31)).toBe("2027-02");
    expect(cycleFor(d("2027-02-27"), 31)).toBe("2027-01");
  });
  it("payday 1 means calendar months", () => {
    expect(cycleFor(d("2026-11-01"), 1)).toBe("2026-11");
    expect(cycleFor(d("2026-11-30"), 1)).toBe("2026-11");
  });
});

describe("cycleRange", () => {
  it("runs from payday to the day before next payday", () => {
    const { start, end } = cycleRange("2026-11", 25);
    expect(start.toISOString().slice(0, 10)).toBe("2026-11-25");
    expect(end.toISOString().slice(0, 10)).toBe("2026-12-24");
  });
  it("handles clamped paydays", () => {
    const { start, end } = cycleRange("2027-01", 31);
    expect(start.toISOString().slice(0, 10)).toBe("2027-01-31");
    expect(end.toISOString().slice(0, 10)).toBe("2027-02-27");
  });
});

describe("shiftCycle", () => {
  it("moves forward and back across years", () => {
    expect(shiftCycle("2026-12", 1)).toBe("2027-01");
    expect(shiftCycle("2027-01", -1)).toBe("2026-12");
    expect(shiftCycle("2026-11", 14)).toBe("2028-01");
  });
});

describe("dueDateIn", () => {
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  it("uses the start month when the due day is on/after payday", () => {
    expect(iso(dueDateIn("2026-11", 25, 28))).toBe("2026-11-28");
  });
  it("uses the next month when the due day is before payday", () => {
    expect(iso(dueDateIn("2026-11", 25, 3))).toBe("2026-12-03");
  });
  it("clamps to short months", () => {
    expect(iso(dueDateIn("2027-01", 25, 31))).toBe("2027-01-31");
    expect(iso(dueDateIn("2027-01", 30, 29))).toBe("2027-02-28");
  });
});

describe("labels", () => {
  it("formats a cycle range and month", () => {
    expect(formatCycle("2026-11", 25)).toBe("25 Nov – 24 Dec");
    expect(cycleMonthLabel("2027-10")).toBe("Oct 2027");
  });
});

describe("pickCycle", () => {
  const now = d("2026-11-30");
  it("defaults to the current cycle", () => {
    expect(pickCycle(undefined, 25, now)).toEqual({ cycle: "2026-11", current: "2026-11" });
    expect(pickCycle("garbage", 25, now).cycle).toBe("2026-11");
  });
  it("allows past cycles but not future ones", () => {
    expect(pickCycle("2026-09", 25, now).cycle).toBe("2026-09");
    expect(pickCycle("2027-01", 25, now).cycle).toBe("2026-11");
  });
});
