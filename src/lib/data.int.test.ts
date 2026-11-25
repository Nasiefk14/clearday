import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  NotFoundError,
  createBankAccount,
  createDebt,
  deleteBankAccount,
  getCycleView,
  renameBankAccount,
  setDebtClosed,
  setSalary,
  updateDebt,
  updateEntry,
} from "@/lib/data";

const debt = (bankAccountId: string, name: string, balance: number, installment: number) => ({
  bankAccountId,
  name,
  type: "OTHER" as const,
  interestRate: null,
  dueDay: null,
  balance,
  installment,
});

async function makeUser(email: string) {
  const user = await prisma.user.create({ data: { email } });
  const main = await createBankAccount(user.id, "Main");
  const savings = await createBankAccount(user.id, "Savings");
  return { id: user.id, main: main.id, savings: savings.id };
}

beforeEach(async () => {
  await prisma.user.deleteMany();
});
afterAll(() => prisma.$disconnect());

describe("carry-over between cycles", () => {
  it("rolls paid debts forward, keeps unpaid ones, drops closed ones and copies salary", async () => {
    const u = await makeUser("a@test.com");
    const card = await createDebt(u.id, debt(u.main, "Card", 1_420_000, 150_000), "2026-10");
    const car = await createDebt(u.id, debt(u.main, "Car", 9_600_000, 430_000), "2026-10");
    const old = await createDebt(u.id, debt(u.savings, "Old", 50_000, 50_000), "2026-10");
    await setSalary(u.id, u.main, "2026-10", 1_850_000);

    const oct = await getCycleView(u.id, "2026-10");
    const cardEntry = oct.accounts[0].debts.find((d) => d.id === card.id)!.entry;
    await updateEntry(u.id, cardEntry.id, { paid: true });
    await setDebtClosed(u.id, old.id, true);

    const nov = await getCycleView(u.id, "2026-11");
    const novDebts = nov.accounts.flatMap((a) => a.debts);
    expect(novDebts.find((d) => d.id === card.id)!.entry).toMatchObject({ balance: 1_270_000, paid: false });
    expect(novDebts.find((d) => d.id === car.id)!.entry.balance).toBe(9_600_000);
    expect(novDebts.map((d) => d.id)).not.toContain(old.id);
    expect(nov.accounts[0].salary).toBe(1_850_000);
    expect(nov.totals.total).toEqual({ owed: 10_870_000, toPay: 580_000, salary: 1_850_000, leftOver: 1_270_000 });
  });

  it("is idempotent", async () => {
    const u = await makeUser("a@test.com");
    await createDebt(u.id, debt(u.main, "Card", 100_000, 10_000), "2026-10");
    await getCycleView(u.id, "2026-11");
    await getCycleView(u.id, "2026-11");
    expect(await prisma.monthEntry.count({ where: { cycle: "2026-11" } })).toBe(1);
  });
});

describe("user isolation", () => {
  it("user B can never see or change user A's data", async () => {
    const a = await makeUser("a@test.com");
    const b = await makeUser("b@test.com");
    const aDebt = await createDebt(a.id, debt(a.main, "A's card", 500_000, 50_000), "2026-11");
    const aEntry = (await getCycleView(a.id, "2026-11")).accounts[0].debts[0].entry;

    const bView = await getCycleView(b.id, "2026-11");
    expect(bView.accounts.flatMap((x) => x.debts)).toHaveLength(0);
    expect(bView.accounts.map((x) => x.id)).not.toContain(a.main);

    await expect(updateEntry(b.id, aEntry.id, { balance: 0 })).rejects.toThrow(NotFoundError);
    await expect(setDebtClosed(b.id, aDebt.id, true)).rejects.toThrow(NotFoundError);
    await expect(updateDebt(b.id, aDebt.id, { ...debt(b.main, "x", 0, 0) })).rejects.toThrow(NotFoundError);
    await expect(updateDebt(a.id, aDebt.id, { ...debt(b.main, "moved", 0, 0) })).rejects.toThrow(NotFoundError);
    await expect(setSalary(b.id, a.main, "2026-11", 1)).rejects.toThrow(NotFoundError);
    await expect(renameBankAccount(b.id, a.main, "hacked")).rejects.toThrow(NotFoundError);
    await expect(deleteBankAccount(b.id, a.savings)).rejects.toThrow(NotFoundError);
    await expect(createDebt(b.id, debt(a.main, "sneaky", 1, 1), "2026-11")).rejects.toThrow(NotFoundError);

    const after = await getCycleView(a.id, "2026-11");
    expect(after.accounts[0].debts[0].entry.balance).toBe(500_000);
    expect(after.accounts.map((x) => x.name)).toEqual(["Main", "Savings"]);
  });

  it("won't delete an account that still has debts", async () => {
    const a = await makeUser("a@test.com");
    await createDebt(a.id, debt(a.main, "Card", 1, 1), "2026-11");
    await expect(deleteBankAccount(a.id, a.main)).rejects.toThrow(NotFoundError);
  });
});
