// The only place that touches user data. Every function takes the signed-in userId
// (from requireUser(), never from the client) and scopes every query by it.
import { prisma } from "@/lib/prisma";
import type { Appearance, DebtType, Style } from "@/generated/prisma/client";
import { monthsToPayoff, rollForward, tally } from "@/lib/budget";
import { toCents, toDecimalString } from "@/lib/money";
import type { Cycle } from "@/lib/cycle";

export class NotFoundError extends Error {
  constructor() {
    super("Not found");
  }
}

const assertFound = (count: number) => {
  if (count === 0) throw new NotFoundError();
};

export function getUser(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, currency: true, payday: true, style: true, appearance: true },
  });
}

export async function updateSettings(
  userId: string,
  data: Partial<{ payday: number; currency: string; style: Style; appearance: Appearance }>,
) {
  await prisma.user.update({ where: { id: userId }, data });
}

/** Create this cycle's rows by carrying over each open debt's latest earlier entry and each account's latest salary. Idempotent. */
export async function ensureCycle(userId: string, cycle: Cycle) {
  const [debts, accounts] = await Promise.all([
    prisma.debt.findMany({
      where: { userId, closedAt: null },
      select: { id: true, entries: { where: { cycle: { lte: cycle } }, orderBy: { cycle: "desc" }, take: 1 } },
    }),
    prisma.bankAccount.findMany({
      where: { userId },
      select: { id: true, months: { where: { cycle: { lte: cycle } }, orderBy: { cycle: "desc" }, take: 1 } },
    }),
  ]);

  const prev = debts.flatMap(({ id, entries: [e] }) =>
    e && e.cycle < cycle
      ? [{ debtId: id, balance: toCents(e.balance), installment: toCents(e.installment), paid: e.paid }]
      : [],
  );
  const next = rollForward(prev, new Set(debts.map((d) => d.id)));
  const salaries = accounts.flatMap(({ id, months: [m] }) =>
    m?.cycle === cycle ? [] : [{ bankAccountId: id, cycle, salary: m?.salary ?? "0" }],
  );

  // skipDuplicates makes concurrent first visits safe (unique on debt+cycle / account+cycle).
  if (next.length)
    await prisma.monthEntry.createMany({
      data: next.map((e) => ({
        debtId: e.debtId,
        cycle,
        balance: toDecimalString(e.balance),
        installment: toDecimalString(e.installment),
      })),
      skipDuplicates: true,
    });
  if (salaries.length) await prisma.bankMonth.createMany({ data: salaries, skipDuplicates: true });
}

/** Everything the dashboard and account pages need for one cycle. */
export async function getCycleView(userId: string, cycle: Cycle) {
  await ensureCycle(userId, cycle);
  const accounts = await prisma.bankAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      months: { where: { cycle } },
      debts: {
        where: { entries: { some: { cycle } } },
        orderBy: { createdAt: "asc" },
        include: { entries: { where: { cycle } } },
      },
    },
  });

  const view = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    salary: a.months[0] ? toCents(a.months[0].salary) : 0,
    debts: a.debts.map((d) => {
      const e = d.entries[0];
      const rate = d.interestRate ? Number(d.interestRate) : 0;
      const balance = toCents(e.balance);
      const installment = toCents(e.installment);
      return {
        id: d.id,
        name: d.name,
        type: d.type,
        interestRate: d.interestRate ? Number(d.interestRate) : null,
        dueDay: d.dueDay,
        closed: d.closedAt !== null,
        entry: { id: e.id, balance, installment, paid: e.paid },
        monthsLeft: monthsToPayoff(balance, installment, rate),
      };
    }),
  }));

  const totals = tally(
    view.map((a) => ({ id: a.id, salary: a.salary })),
    view.flatMap((a) => a.debts.map((d) => ({ bankAccountId: a.id, ...d.entry }))),
  );
  const startedByDebt = await startingBalances(userId, cycle);
  const started = [...startedByDebt.values()].reduce((a, b) => a + b, 0);
  return { accounts: view, totals, started, startedByDebt };
}

export type CycleView = Awaited<ReturnType<typeof getCycleView>>;

/** Each debt's first recorded balance (up to this cycle), closed debts included: the baseline for progress. */
async function startingBalances(userId: string, cycle: Cycle) {
  const debts = await prisma.debt.findMany({
    where: { userId },
    select: {
      id: true,
      entries: { where: { cycle: { lte: cycle } }, orderBy: { cycle: "asc" }, take: 1, select: { balance: true } },
    },
  });
  return new Map(debts.flatMap((d) => (d.entries[0] ? [[d.id, toCents(d.entries[0].balance)] as const] : [])));
}

// ---------- bank accounts ----------

export function createBankAccount(userId: string, name: string) {
  return prisma.bankAccount.create({ data: { userId, name } });
}

export async function renameBankAccount(userId: string, id: string, name: string) {
  assertFound((await prisma.bankAccount.updateMany({ where: { id, userId }, data: { name } })).count);
}

/** Only empty accounts can be deleted, so a misclick can't wipe debts. */
export async function deleteBankAccount(userId: string, id: string) {
  assertFound((await prisma.bankAccount.deleteMany({ where: { id, userId, debts: { none: {} } } })).count);
}

export async function setSalary(userId: string, bankAccountId: string, cycle: Cycle, cents: number) {
  await assertOwnsAccount(userId, bankAccountId);
  const salary = toDecimalString(cents);
  await prisma.bankMonth.upsert({
    where: { bankAccountId_cycle: { bankAccountId, cycle } },
    create: { bankAccountId, cycle, salary },
    update: { salary },
  });
}

async function assertOwnsAccount(userId: string, id: string) {
  if (!(await prisma.bankAccount.findFirst({ where: { id, userId }, select: { id: true } }))) throw new NotFoundError();
}

// ---------- debts ----------

export type DebtInput = {
  bankAccountId: string;
  name: string;
  type: DebtType;
  interestRate: number | null;
  dueDay: number | null;
};

export async function createDebt(
  userId: string,
  input: DebtInput & { balance: number; installment: number },
  cycle: Cycle,
) {
  await assertOwnsAccount(userId, input.bankAccountId);
  // Make sure this cycle already exists so the new debt doesn't block other debts carrying over.
  await ensureCycle(userId, cycle);
  const { bankAccountId, name, type, interestRate, dueDay, balance, installment } = input;
  return prisma.debt.create({
    data: {
      bankAccountId,
      name,
      type,
      interestRate,
      dueDay,
      userId,
      entries: {
        create: { cycle, balance: toDecimalString(balance), installment: toDecimalString(installment) },
      },
    },
  });
}

export async function updateDebt(userId: string, id: string, input: DebtInput) {
  await assertOwnsAccount(userId, input.bankAccountId);
  // Copy fields explicitly so nothing extra (userId, closedAt…) can be written.
  const { bankAccountId, name, type, interestRate, dueDay } = input;
  const data = { bankAccountId, name, type, interestRate, dueDay };
  assertFound((await prisma.debt.updateMany({ where: { id, userId }, data })).count);
}

export async function setDebtClosed(userId: string, id: string, closed: boolean) {
  assertFound(
    (await prisma.debt.updateMany({ where: { id, userId }, data: { closedAt: closed ? new Date() : null } })).count,
  );
}

export async function updateEntry(
  userId: string,
  entryId: string,
  data: { balance?: number; installment?: number; paid?: boolean },
) {
  const result = await prisma.monthEntry.updateMany({
    where: { id: entryId, debt: { userId } },
    data: {
      paid: data.paid,
      balance: data.balance === undefined ? undefined : toDecimalString(data.balance),
      installment: data.installment === undefined ? undefined : toDecimalString(data.installment),
    },
  });
  assertFound(result.count);
}

/** Manage page: all accounts and debts, including closed ones, with each debt's latest numbers. */
export function listForManage(userId: string) {
  return prisma.bankAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      debts: {
        orderBy: [{ closedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
        include: { entries: { orderBy: { cycle: "desc" }, take: 1 } },
      },
    },
  });
}
