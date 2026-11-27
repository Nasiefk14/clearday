// Pure money logic. All amounts are integer cents.

export type Entry = { debtId: string; balance: number; installment: number; paid: boolean };

/** Next cycle's entries: paid debts drop by their installment (never below 0), closed debts are left out. */
export function rollForward(prev: Entry[], openDebtIds: Set<string>): Entry[] {
  return prev
    .filter((e) => openDebtIds.has(e.debtId))
    .map((e) => ({
      debtId: e.debtId,
      installment: e.installment,
      paid: false,
      balance: e.paid ? Math.max(0, e.balance - e.installment) : e.balance,
    }));
}

export type Totals = { owed: number; toPay: number; salary: number; leftOver: number };

export function tally(
  accounts: { id: string; salary: number }[],
  entries: { bankAccountId: string; balance: number; installment: number }[],
) {
  const byAccount: Record<string, Totals> = {};
  for (const a of accounts) byAccount[a.id] = { owed: 0, toPay: 0, salary: a.salary, leftOver: a.salary };
  for (const e of entries) {
    const t = byAccount[e.bankAccountId];
    if (!t) continue;
    t.owed += e.balance;
    t.toPay += e.installment;
    t.leftOver -= e.installment;
  }
  const total: Totals = { owed: 0, toPay: 0, salary: 0, leftOver: 0 };
  for (const t of Object.values(byAccount)) {
    total.owed += t.owed;
    total.toPay += t.toPay;
    total.salary += t.salary;
    total.leftOver += t.leftOver;
  }
  return { byAccount, total };
}

/** Months until the balance hits zero, with optional annual interest %. null = never (installment doesn't cover interest). */
export function monthsToPayoff(balance: number, installment: number, annualRatePct = 0): number | null {
  if (balance <= 0) return 0;
  if (installment <= 0) return null;
  const rate = annualRatePct / 1200;
  let b = balance;
  let months = 0;
  while (b > 0) {
    const interest = b * rate;
    if (installment <= interest || months >= 1200) return null;
    b += interest - installment;
    months++;
  }
  return months;
}

/** Share of the starting debt that's been paid off, 0–1. */
export function progress(owed: number, started: number): number {
  if (started <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - owed / started));
}
