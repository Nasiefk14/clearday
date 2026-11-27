import Link from "next/link";
import { requireUserId } from "@/auth";
import { getCycleView, getUser } from "@/lib/data";
import { cycleMonthLabel, dueDateIn, pickCycle, shiftCycle, type Cycle } from "@/lib/cycle";
import { progress } from "@/lib/budget";
import { formatMoney, formatMoneyShort } from "@/lib/money";
import { DEBT_EMOJI } from "@/lib/options";
import { Sheet } from "@/components/sheet";
import { saveDebtAction, setDebtClosedAction, setPaidAction, setSalariesAction } from "../actions";

const DAY = 86_400_000;

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const userId = await requireUserId();
  const user = await getUser(userId);
  const { cycle, current } = pickCycle((await searchParams).cycle, user.payday);
  const { accounts, totals, started, startedByDebt } = await getCycleView(userId, cycle);
  const playful = user.style === "PLAYFUL";
  const money = (c: number) => formatMoney(c, user.currency);

  if (accounts.length === 0) {
    return (
      <div className="mt-10">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Clearday</h1>
        <p className="mt-3 text-muted">Add the bank accounts your payments go off from, then add what you owe.</p>
        <Link href="/manage" className="btn mt-6 w-full">
          Set up my accounts
        </Link>
      </div>
    );
  }

  const owed = totals.total.owed;
  const pct = progress(owed, started);
  const owing = accounts.flatMap((a) => a.debts).filter((d) => d.entry.balance > 0);
  const debtFree = debtFreeLabel(cycle, owing.map((d) => d.monthsLeft));

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const payments = accounts.flatMap((a) =>
    a.debts.map((d) => {
      const days =
        cycle === current && !d.entry.paid && d.dueDay
          ? Math.round((dueDateIn(cycle, user.payday, d.dueDay).getTime() - today) / DAY)
          : null;
      const due = days === null ? null : days < 0 ? "overdue" : days === 0 ? "due today" : `due in ${days} day${days === 1 ? "" : "s"}`;
      return { ...d, account: a, due, started: startedByDebt.get(d.id) ?? d.entry.balance };
    }),
  );
  const paidCount = payments.filter((p) => p.entry.paid).length;
  const month = cycleMonthLabel(cycle).split(" ")[0];

  return (
    <>
      <TopBar playful={playful} name={user.name} cycle={cycle} current={current} month={month} />

      {playful ? (
        <section className="mt-5 rounded-[28px] bg-lime p-5 text-night">
          <p className="text-sm font-extrabold text-lime-ink">You&apos;ve paid off</p>
          <p className="text-5xl font-black">{Math.round(pct * 100)}%</p>
          <div className="relative my-3 h-4 rounded-full bg-night/10" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-label="Paid off">
            <div className="absolute inset-y-0 left-0 rounded-full bg-night" style={{ width: `${pct * 100}%` }} />
            <span aria-hidden className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl" style={{ left: `${pct * 100}%` }}>
              🏃
            </span>
          </div>
          <div className="flex justify-between text-sm font-extrabold">
            <span>{money(owed)} to go</span>
            <span>🏁 {debtFree ?? "not yet"}</span>
          </div>
        </section>
      ) : (
        <section className="mt-7">
          <h1 className="text-6xl leading-none font-bold tracking-tighter">
            <span className="rounded-xl bg-hl-bg px-(--hl-pad) text-hl">{Math.round(pct * 100)}%</span> paid
          </h1>
          <p className="mt-2 text-muted">
            {money(owed)} left{debtFree && ` · debt-free ${debtFree}`}
          </p>
          <Blocks count={10} filled={Math.round(pct * 10)} className="mt-5 mb-2.5 h-6.5 gap-1" />
          <div className="flex justify-between text-sm text-muted">
            <span>Started {formatMoneyShort(started, user.currency)}</span>
            <b className="text-ink">{debtFree ?? "Not at this rate"}</b>
          </div>
        </section>
      )}

      <div className={`grid grid-cols-2 gap-2.5 ${playful ? "mt-3.5" : "mt-6"}`}>
        <div className="card p-3.5">
          <p className="text-xs font-semibold text-muted">Going out</p>
          <p className="text-[22px] font-bold">{money(totals.total.toPay)}</p>
        </div>
        <Sheet
          label="Edit salary"
          triggerClassName="rounded-2xl bg-lime p-3.5 text-left text-night"
          trigger={
            <>
              <span className="block text-xs font-semibold text-lime-ink">Left over{playful && " 🎉"}</span>
              <span className={`block text-[22px] font-bold ${totals.total.leftOver < 0 ? "text-red-700" : ""}`}>
                {money(totals.total.leftOver)}
              </span>
            </>
          }
        >
          <h2 className="text-2xl font-bold">Salary this month</h2>
          <p className="mt-1 mb-4 text-sm text-muted">What gets paid into each account. Left over = salary − payments.</p>
          <form action={setSalariesAction} className="space-y-3">
            <input type="hidden" name="cycle" value={cycle} />
            {accounts.map((a) => (
              <label key={a.id} className="block">
                <span className="label">{a.name}</span>
                <input name={`salary:${a.id}`} inputMode="decimal" required defaultValue={a.salary / 100} className="field mt-1" />
              </label>
            ))}
            <button className="btn w-full">Done</button>
          </form>
        </Sheet>
      </div>

      <h2 className={`mt-6 mb-2 flex justify-between px-0.5 ${playful ? "font-black" : "text-sm text-muted"}`}>
        {playful ? "This month's payments" : "This month"}
        <span className="text-sm font-semibold text-muted">
          {paidCount} of {payments.length} paid
        </span>
      </h2>

      <ul className="space-y-1.5">
        {payments.map((p) => (
          <li key={p.id} className={`card flex items-center gap-3 px-3.5 py-3 ${p.entry.paid ? "opacity-55" : ""} ${playful ? "rounded-[18px]" : ""}`}>
            {!playful && <Tick id={p.entry.id} paid={p.entry.paid} name={p.name} />}
            <Sheet
              label={`Edit ${p.name}`}
              triggerClassName="flex min-w-0 flex-1 items-center gap-3 text-left"
              trigger={
                <>
                  {playful && (
                    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-empty text-lg">
                      {DEBT_EMOJI[p.type]}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${playful ? "font-extrabold" : "font-semibold"}`}>{p.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {playful
                        ? p.due
                          ? `${money(p.entry.installment)} · ${p.due}`
                          : p.account.name
                        : [p.account.name, p.due?.replace("due in ", "")].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {!playful && <span className="font-semibold">{money(p.entry.installment)}</span>}
                </>
              }
            >
              <h2 className={`text-[26px] tracking-tight ${playful ? "font-black" : "font-bold"}`}>
                {playful && `${DEBT_EMOJI[p.type]} `}
                {p.name}
              </h2>
              <p className="mt-1 mb-3.5 text-sm text-muted">
                {p.entry.balance === 0
                  ? "Paid off"
                  : p.monthsLeft === null
                    ? "The installment doesn't cover the interest"
                    : `Debt-free ${cycleMonthLabel(shiftCycle(cycle, p.monthsLeft - 1))}`}{" "}
                · from {p.account.name}
              </p>
              {playful ? (
                <div className="mb-4 h-3 overflow-hidden rounded-full bg-empty">
                  <div className="h-full rounded-full bg-lime" style={{ width: `${progress(p.entry.balance, p.started) * 100}%` }} />
                </div>
              ) : (
                <Blocks count={20} filled={Math.round(progress(p.entry.balance, p.started) * 20)} className="mb-4 h-2.5 gap-0.75" />
              )}
              <form action={saveDebtAction} className="grid grid-cols-2 gap-x-2.5 gap-y-3">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="entryId" value={p.entry.id} />
                <input type="hidden" name="name" value={p.name} />
                <input type="hidden" name="type" value={p.type} />
                <Field label="Still owe">
                  <input name="balance" inputMode="decimal" required defaultValue={p.entry.balance / 100} className="field" />
                </Field>
                <Field label="Pay each month">
                  <input name="installment" inputMode="decimal" required defaultValue={p.entry.installment / 100} className="field" />
                </Field>
                <Field label="Interest % a year">
                  <input name="interestRate" inputMode="decimal" defaultValue={p.interestRate ?? ""} placeholder="optional" className="field" />
                </Field>
                <Field label="Due on (day)">
                  <input name="dueDay" type="number" min={1} max={31} defaultValue={p.dueDay ?? ""} placeholder="optional" className="field" />
                </Field>
                <Field label="Paid from" wide>
                  <select name="bankAccountId" defaultValue={p.account.id} className="field">
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <button className="btn col-span-2 mt-1">Done</button>
              </form>
              <form action={setDebtClosedAction} className="mt-3 text-center">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="closed" value="1" />
                <button className="text-sm font-semibold text-muted underline">Mark as fully paid off</button>
              </form>
            </Sheet>
            {playful && <Tick id={p.entry.id} paid={p.entry.paid} name={p.name} />}
          </li>
        ))}
      </ul>

      <Link href="/manage#add-debt" className="mt-2 block rounded-2xl border-2 border-dashed border-line py-3 text-center text-sm font-semibold text-muted">
        + Add a debt
      </Link>
    </>
  );
}

function debtFreeLabel(cycle: Cycle, months: (number | null)[]) {
  if (months.length === 0) return "now";
  if (months.includes(null)) return null;
  return cycleMonthLabel(shiftCycle(cycle, Math.max(...(months as number[])) - 1));
}

function TopBar({ playful, name, cycle, current, month }: { playful: boolean; name: string | null; cycle: Cycle; current: Cycle; month: string }) {
  const next = shiftCycle(cycle, 1);
  const href = (c: Cycle) => (c === current ? "/dashboard" : `/dashboard?cycle=${c}`);
  return (
    <header className="flex items-center justify-between">
      {playful ? (
        <span className="text-[22px] font-black">Hey {name?.split(" ")[0] ?? "there"} 👋</span>
      ) : (
        <span className="text-lg font-bold">clearday</span>
      )}
      <nav className="flex items-center gap-1">
        <div className={`flex items-center text-sm font-bold ${playful ? "rounded-full bg-card px-1 shadow-shade" : "text-muted uppercase"}`}>
          <Link href={href(shiftCycle(cycle, -1))} aria-label="Previous month" className="px-2 py-1.5">
            ‹
          </Link>
          <span className={playful ? "text-ink" : ""}>{month}</span>
          {next <= current ? (
            <Link href={href(next)} aria-label="Next month" className="px-2 py-1.5">
              ›
            </Link>
          ) : (
            <span aria-hidden className="px-2 py-1.5 opacity-30">
              ›
            </span>
          )}
        </div>
        <Link href="/settings" aria-label="Settings" className="grid size-9 place-items-center rounded-full text-lg text-muted hover:bg-card">
          ⚙︎
        </Link>
      </nav>
    </header>
  );
}

function Blocks({ count, filled, className }: { count: number; filled: number; className: string }) {
  return (
    <div className={`flex ${className}`} role="progressbar" aria-valuenow={Math.round((filled / count) * 100)} aria-label="Paid off">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={`flex-1 rounded-md ${i < filled ? "bg-lime" : "bg-empty"}`} />
      ))}
    </div>
  );
}

function Tick({ id, paid, name }: { id: string; paid: boolean; name: string }) {
  return (
    <form action={setPaidAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="paid" value={paid ? "0" : "1"} />
      <button
        aria-label={paid ? `Mark ${name} as not paid` : `Mark ${name} as paid`}
        aria-pressed={paid}
        className={`grid size-7 shrink-0 place-items-center rounded-lg border-2 text-sm font-black text-night ${
          paid ? "border-tick-on bg-lime" : "border-line"
        }`}
      >
        {paid ? "✓" : ""}
      </button>
    </form>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${wide ? "col-span-2" : ""}`}>
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
