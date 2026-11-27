import { describe, expect, it } from "vitest";
import { monthsToPayoff, progress, rollForward, tally } from "./budget";

describe("rollForward", () => {
  const prev = [
    { debtId: "card", balance: 1_420_000, installment: 150_000, paid: true },
    { debtId: "car", balance: 9_600_000, installment: 430_000, paid: false },
    { debtId: "store", balance: 50_000, installment: 65_000, paid: true },
    { debtId: "closed", balance: 100_000, installment: 10_000, paid: true },
  ];
  const next = rollForward(prev, new Set(["card", "car", "store"]));

  it("subtracts the installment from paid debts", () => {
    expect(next.find((e) => e.debtId === "card")?.balance).toBe(1_270_000);
  });
  it("keeps the balance of unpaid debts", () => {
    expect(next.find((e) => e.debtId === "car")?.balance).toBe(9_600_000);
  });
  it("never goes below zero", () => {
    expect(next.find((e) => e.debtId === "store")?.balance).toBe(0);
  });
  it("skips closed debts", () => {
    expect(next.map((e) => e.debtId)).not.toContain("closed");
  });
  it("resets paid and keeps installments", () => {
    expect(next.every((e) => e.paid === false)).toBe(true);
    expect(next.find((e) => e.debtId === "car")?.installment).toBe(430_000);
  });
  it("is pure (does not mutate the previous month)", () => {
    expect(prev[0].balance).toBe(1_420_000);
  });
});

describe("tally", () => {
  const accounts = [
    { id: "main", salary: 1_850_000 },
    { id: "savings", salary: 900_000 },
  ];
  const entries = [
    { bankAccountId: "main", balance: 1_420_000, installment: 150_000 },
    { bankAccountId: "main", balance: 9_600_000, installment: 430_000 },
    { bankAccountId: "savings", balance: 380_000, installment: 65_000 },
    { bankAccountId: "savings", balance: 2_200_000, installment: 190_000 },
  ];
  const t = tally(accounts, entries);

  it("totals each bank account", () => {
    expect(t.byAccount.main).toEqual({ owed: 11_020_000, toPay: 580_000, salary: 1_850_000, leftOver: 1_270_000 });
    expect(t.byAccount.savings).toEqual({ owed: 2_580_000, toPay: 255_000, salary: 900_000, leftOver: 645_000 });
  });
  it("totals everything", () => {
    expect(t.total).toEqual({ owed: 13_600_000, toPay: 835_000, salary: 2_750_000, leftOver: 1_915_000 });
  });
  it("includes accounts with no debts and allows negative left over", () => {
    const r = tally([{ id: "a", salary: 100 }, { id: "b", salary: 0 }], [{ bankAccountId: "b", balance: 500, installment: 300 }]);
    expect(r.byAccount.a).toEqual({ owed: 0, toPay: 0, salary: 100, leftOver: 100 });
    expect(r.byAccount.b.leftOver).toBe(-300);
  });
});

describe("monthsToPayoff", () => {
  it("is a simple division without interest", () => {
    expect(monthsToPayoff(380_000, 65_000)).toBe(6);
  });
  it("includes monthly interest", () => {
    // R14,200 at 20.75% paying R1,500/month
    expect(monthsToPayoff(1_420_000, 150_000, 20.75)).toBe(11);
  });
  it("is 0 when already paid off", () => {
    expect(monthsToPayoff(0, 150_000)).toBe(0);
  });
  it("is null when it will never be paid off", () => {
    expect(monthsToPayoff(1_000_000, 0)).toBeNull();
    expect(monthsToPayoff(10_000_000, 50_000, 12)).toBeNull(); // interest R1,000 > installment R500
  });
});

describe("progress", () => {
  it("is the share paid off since the start", () => {
    expect(progress(13_600_000, 19_700_000)).toBeCloseTo(0.3096, 3);
  });
  it("is clamped and safe with no history", () => {
    expect(progress(0, 100)).toBe(1);
    expect(progress(150, 100)).toBe(0); // balance grew (fees/interest)
    expect(progress(100, 0)).toBe(0);
  });
});
