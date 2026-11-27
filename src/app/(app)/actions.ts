"use server";

// Every action: validate input with zod, take the user id from the session (never the form), call the data layer.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId, signOut } from "@/auth";
import * as data from "@/lib/data";
import { cycleFor, isCycle } from "@/lib/cycle";
import { parseMoney } from "@/lib/money";
import { CURRENCIES, DEBT_TYPES } from "@/lib/options";

const id = z.string().min(1).max(50);
const name = z.string().trim().min(1, "Give it a name").max(60);
const money = z.string().transform((s, ctx) => {
  const cents = parseMoney(s);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: "Enter an amount like 1500 or 1500.50" });
    return z.NEVER;
  }
  return cents;
});
const optionalNumber = (min: number, max: number, int: boolean) =>
  z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : Number(s)))
    .refine((n) => n === null || (Number.isFinite(n) && n >= min && n <= max && (!int || Number.isInteger(n))), {
      message: `Must be between ${min} and ${max}`,
    });
const debtFields = {
  bankAccountId: id,
  name,
  type: z.enum(DEBT_TYPES.map((t) => t.value) as [string, ...string[]]).transform((t) => t as data.DebtInput["type"]),
  interestRate: optionalNumber(0, 100, false),
  dueDay: optionalNumber(1, 31, true),
};

const form = (fd: FormData) => Object.fromEntries(fd);
const done = () => revalidatePath("/", "layout");

export async function createBankAccountAction(fd: FormData) {
  const userId = await requireUserId();
  const input = z.object({ name }).parse(form(fd));
  await data.createBankAccount(userId, input.name);
  done();
}

export async function renameBankAccountAction(fd: FormData) {
  const userId = await requireUserId();
  const input = z.object({ id, name }).parse(form(fd));
  await data.renameBankAccount(userId, input.id, input.name);
  done();
}

export async function deleteBankAccountAction(fd: FormData) {
  const userId = await requireUserId();
  const input = z.object({ id }).parse(form(fd));
  await data.deleteBankAccount(userId, input.id);
  done();
}

export async function createDebtAction(fd: FormData) {
  const userId = await requireUserId();
  const input = z.object({ ...debtFields, balance: money, installment: money }).parse(form(fd));
  const user = await data.getUser(userId);
  await data.createDebt(userId, input, cycleFor(new Date(), user.payday));
  done();
}

export async function updateDebtAction(fd: FormData) {
  const userId = await requireUserId();
  const { id: debtId, ...input } = z.object({ id, ...debtFields }).parse(form(fd));
  await data.updateDebt(userId, debtId, input);
  done();
}

export async function setDebtClosedAction(fd: FormData) {
  const userId = await requireUserId();
  const input = z.object({ id, closed: z.enum(["0", "1"]) }).parse(form(fd));
  await data.setDebtClosed(userId, input.id, input.closed === "1");
  done();
}

export async function updateEntryAction(fd: FormData) {
  const userId = await requireUserId();
  const input = z.object({ id, balance: money, installment: money }).parse(form(fd));
  await data.updateEntry(userId, input.id, { balance: input.balance, installment: input.installment });
  done();
}

export async function setPaidAction(fd: FormData) {
  const userId = await requireUserId();
  const input = z.object({ id, paid: z.enum(["0", "1"]) }).parse(form(fd));
  await data.updateEntry(userId, input.id, { paid: input.paid === "1" });
  done();
}

export async function setSalaryAction(fd: FormData) {
  const userId = await requireUserId();
  const input = z.object({ bankAccountId: id, cycle: z.string().refine(isCycle), salary: money }).parse(form(fd));
  await data.setSalary(userId, input.bankAccountId, input.cycle, input.salary);
  done();
}

/** Edit sheet: the debt's terms and this month's numbers in one save. */
export async function saveDebtAction(fd: FormData) {
  const userId = await requireUserId();
  const { id: debtId, entryId, balance, installment, ...terms } = z
    .object({ id, entryId: id, ...debtFields, balance: money, installment: money })
    .parse(form(fd));
  await data.updateDebt(userId, debtId, terms);
  await data.updateEntry(userId, entryId, { balance, installment });
  done();
}

/** Salary sheet: one "salary:<bankAccountId>" field per account for a cycle. */
export async function setSalariesAction(fd: FormData) {
  const userId = await requireUserId();
  const cycle = z.string().refine(isCycle).parse(fd.get("cycle"));
  const salaries = [...fd.entries()].filter(([k]) => k.startsWith("salary:"));
  for (const [key, value] of salaries) {
    await data.setSalary(userId, id.parse(key.slice(7)), cycle, money.parse(value));
  }
  done();
}

export async function updatePreferenceAction(fd: FormData) {
  const userId = await requireUserId();
  const input = z
    .object({ style: z.enum(["BOLD", "PLAYFUL"]).optional(), appearance: z.enum(["SYSTEM", "LIGHT", "DARK"]).optional() })
    .parse(form(fd));
  await data.updateSettings(userId, input);
  done();
}

export async function updateSettingsAction(fd: FormData) {
  const userId = await requireUserId();
  const input = z
    .object({
      payday: z.coerce.number().int().min(1).max(31),
      currency: z.enum(CURRENCIES as [string, ...string[]]),
    })
    .parse(form(fd));
  await data.updateSettings(userId, input);
  done();
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
