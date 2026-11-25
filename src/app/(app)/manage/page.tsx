import { requireUserId } from "@/auth";
import { getUser, listForManage } from "@/lib/data";
import { formatMoney, toCents } from "@/lib/money";
import { CURRENCIES, DEBT_TYPES } from "@/lib/options";
import {
  createBankAccountAction,
  createDebtAction,
  deleteBankAccountAction,
  renameBankAccountAction,
  setDebtClosedAction,
  updateDebtAction,
  updateSettingsAction,
} from "../actions";

type Account = Awaited<ReturnType<typeof listForManage>>[number];
type Debt = Account["debts"][number];

export default async function ManagePage() {
  const userId = await requireUserId();
  const [user, accounts] = await Promise.all([getUser(userId), listForManage(userId)]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Manage</h1>

      <Section title="Bank accounts" hint="The accounts your payments go off from.">
        {accounts.map((a) => (
          <div key={a.id} className="card flex flex-wrap items-center gap-2 p-3">
            <form action={renameBankAccountAction} className="flex flex-1 gap-2">
              <input type="hidden" name="id" value={a.id} />
              <input name="name" required maxLength={60} defaultValue={a.name} aria-label="Account name" className="field" />
              <button className="btn-ghost">Rename</button>
            </form>
            {a.debts.length === 0 && (
              <form action={deleteBankAccountAction}>
                <input type="hidden" name="id" value={a.id} />
                <button className="btn-ghost text-neg">Delete</button>
              </form>
            )}
          </div>
        ))}
        <form action={createBankAccountAction} className="flex gap-2">
          <input name="name" required maxLength={60} placeholder="e.g. Main account" aria-label="New account name" className="field" />
          <button className="btn shrink-0">Add account</button>
        </form>
      </Section>

      {accounts.length > 0 && (
        <Section title="Add a debt" hint="It starts in this month. Balance and installment can change each month on the account page.">
          <form action={createDebtAction} className="card grid gap-3 p-4 sm:grid-cols-2">
            <DebtFields accounts={accounts} />
            <Field label="Balance owed">
              <input name="balance" inputMode="decimal" required placeholder="14200" className="field" />
            </Field>
            <Field label="Monthly installment">
              <input name="installment" inputMode="decimal" required placeholder="1500" className="field" />
            </Field>
            <button className="btn sm:col-span-2">Add debt</button>
          </form>
        </Section>
      )}

      {accounts.some((a) => a.debts.length > 0) && (
        <Section title="Your debts" hint="Close a debt when it's paid off or settled. It disappears from next month onwards.">
          {accounts.flatMap((a) => a.debts).map((d) => (
            <DebtRow key={d.id} debt={d} accounts={accounts} currency={user.currency} />
          ))}
        </Section>
      )}

      <Section title="Settings">
        <form action={updateSettingsAction} className="card grid grid-cols-2 gap-3 p-4">
          <Field label="Payday (day of month)">
            <input name="payday" type="number" min={1} max={31} required defaultValue={user.payday} className="field" />
          </Field>
          <Field label="Currency">
            <select name="currency" defaultValue={user.currency} className="field">
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <button className="btn col-span-2">Save settings</button>
        </form>
      </Section>
    </div>
  );
}

function DebtRow({ debt, accounts, currency }: { debt: Debt; accounts: Account[]; currency: string }) {
  const latest = debt.entries[0];
  return (
    <details className="card p-4">
      <summary className="flex cursor-pointer items-center justify-between gap-2 font-bold">
        <span className={debt.closedAt ? "text-muted line-through" : ""}>{debt.name}</span>
        <span className="text-sm font-normal text-muted">
          {debt.closedAt ? "Closed" : latest ? `${formatMoney(toCents(latest.balance), currency)} owed` : ""}
        </span>
      </summary>
      <form action={updateDebtAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={debt.id} />
        <DebtFields accounts={accounts} debt={debt} />
        <button className="btn-ghost sm:col-span-2">Save details</button>
      </form>
      <form action={setDebtClosedAction} className="mt-2">
        <input type="hidden" name="id" value={debt.id} />
        <input type="hidden" name="closed" value={debt.closedAt ? "0" : "1"} />
        <button className="text-sm font-semibold text-muted underline">{debt.closedAt ? "Reopen this debt" : "Close this debt"}</button>
      </form>
    </details>
  );
}

function DebtFields({ accounts, debt }: { accounts: Account[]; debt?: Debt }) {
  return (
    <>
      <Field label="Name">
        <input name="name" required maxLength={60} defaultValue={debt?.name} placeholder="e.g. Credit card" className="field" />
      </Field>
      <Field label="Type">
        <select name="type" defaultValue={debt?.type ?? "OTHER"} className="field">
          {DEBT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Paid from">
        <select name="bankAccountId" defaultValue={debt?.bankAccountId ?? accounts[0]?.id} className="field">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Interest % (optional)">
          <input name="interestRate" inputMode="decimal" defaultValue={debt?.interestRate?.toString() ?? ""} placeholder="20.75" className="field" />
        </Field>
        <Field label="Due day (optional)">
          <input name="dueDay" type="number" min={1} max={31} defaultValue={debt?.dueDay ?? ""} placeholder="1" className="field" />
        </Field>
      </div>
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
