// Fake demo data for local development. Never put real balances here: this repo is public.
// Sign-in still requires the email to be in ALLOWED_EMAILS, so this user can't log in anywhere by default.
import { prisma } from "../src/lib/prisma";
import { createBankAccount, createDebt, setSalary, updateEntry, getCycleView } from "../src/lib/data";
import { cycleFor, shiftCycle } from "../src/lib/cycle";

const EMAIL = "demo@clearday.local";

async function main() {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({ data: { email: EMAIL, name: "Demo", payday: 25, currency: "ZAR" } });
  const current = cycleFor(new Date(), user.payday);
  const start = shiftCycle(current, -2); // two months of history

  const main = await createBankAccount(user.id, "Main account");
  const savings = await createBankAccount(user.id, "Savings account");
  await setSalary(user.id, main.id, start, 1_850_000);
  await setSalary(user.id, savings.id, start, 900_000);

  const debts = [
    { bankAccountId: main.id, name: "Credit card", type: "CREDIT_CARD", interestRate: 20.75, dueDay: 1, balance: 1_720_000, installment: 150_000 },
    { bankAccountId: main.id, name: "Car payment", type: "CAR", interestRate: 11.5, dueDay: 28, balance: 10_460_000, installment: 430_000 },
    { bankAccountId: savings.id, name: "Store account", type: "STORE", interestRate: null, dueDay: 27, balance: 510_000, installment: 65_000 },
    { bankAccountId: savings.id, name: "Personal loan", type: "PERSONAL_LOAN", interestRate: 18, dueDay: 5, balance: 2_580_000, installment: 190_000 },
  ] as const;
  for (const d of debts) await createDebt(user.id, d, start);

  // Pay everything in the two past months so the carry-over shows real progress.
  for (const cycle of [start, shiftCycle(start, 1)]) {
    const view = await getCycleView(user.id, cycle);
    for (const d of view.accounts.flatMap((a) => a.debts)) await updateEntry(user.id, d.entry.id, { paid: true });
  }
  await getCycleView(user.id, current);
  console.log(`Seeded ${EMAIL} with history from ${start} to ${current}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
