import Link from "next/link";
import { requireUserId } from "@/auth";
import { getCycleView, getUser } from "@/lib/data";
import { cycleMonthLabel, dueDateIn, pickCycle, shiftCycle } from "@/lib/cycle";
import { formatMoney } from "@/lib/money";
import { CycleSwitcher } from "@/components/cycle-switcher";

const DAY = 86_400_000;

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const userId = await requireUserId();
  const user = await getUser(userId);
  const { cycle, current } = pickCycle((await searchParams).cycle, user.payday);
  const { accounts, totals } = await getCycleView(userId, cycle);
  const money = (cents: number) => formatMoney(cents, user.currency);
  const debts = accounts.flatMap((a) => a.debts);

  if (accounts.length === 0) {
    return (
      <div className="card mt-4 p-6">
        <h1 className="font-display text-2xl font-bold">Welcome to Clearday</h1>
        <p className="mt-2 text-muted">Start by adding the bank accounts your payments go off from, then add what you owe.</p>
        <Link href="/manage" className="btn mt-4">
          Set up my accounts
        </Link>
      </div>
    );
  }

  // Debt-free date: the latest payoff month across debts that still have a balance.
  const owing = debts.filter((d) => d.entry.balance > 0);
  const months = owing.map((d) => d.monthsLeft);
  const debtFree =
    owing.length === 0
      ? "Debt-free!"
      : months.includes(null)
        ? null
        : cycleMonthLabel(shiftCycle(cycle, Math.max(...(months as number[])) - 1));

  // Due soon: unpaid installments due within 5 days (or overdue), current cycle only.
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueSoon =
    cycle === current
      ? debts.flatMap((d) => {
          if (d.entry.paid || !d.dueDay || d.entry.installment === 0) return [];
          const days = Math.round((dueDateIn(cycle, user.payday, d.dueDay).getTime() - today) / DAY);
          return days <= 5 ? [{ name: d.name, days }] : [];
        })
      : [];

  return (
    <div className="space-y-3">
      <CycleSwitcher cycle={cycle} current={current} payday={user.payday} basePath="/dashboard" />

      {dueSoon.map((d) => (
        <p key={d.name} className="flex gap-2 rounded-xl border border-warn-line bg-warn-bg px-3 py-2.5 text-sm text-warn-ink">
          <span aria-hidden>🔔</span>
          <span>
            <b>{d.name}</b>{" "}
            {d.days < 0 ? `was due ${-d.days} day${d.days === -1 ? "" : "s"} ago` : d.days === 0 ? "is due today" : `is due in ${d.days} day${d.days === 1 ? "" : "s"}`}{" "}
            and isn&apos;t ticked off yet.
          </span>
        </p>
      ))}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Total owed" value={money(totals.total.owed)} />
        <Tile label="Paying this month" value={money(totals.total.toPay)} />
        <Tile label="Salary" value={money(totals.total.salary)} />
        <Tile label="Left over" value={money(totals.total.leftOver)} highlight negative={totals.total.leftOver < 0} />
      </div>

      <div className="flex items-baseline justify-between rounded-2xl bg-soft px-4 py-3">
        <span className="label">Debt-free by</span>
        <span className="font-display text-2xl font-bold">{debtFree ?? "Not at this rate"}</span>
      </div>
      {debtFree === null && (
        <p className="text-sm text-muted">At least one installment doesn&apos;t cover its interest, so that debt never reaches zero.</p>
      )}

      <h2 className="label px-1 pt-2">Bank accounts</h2>
      {accounts.map((a) => {
        const t = totals.byAccount[a.id];
        return (
          <Link
            key={a.id}
            href={`/accounts/${a.id}${cycle === current ? "" : `?cycle=${cycle}`}`}
            className="card flex items-center justify-between px-4 py-3 hover:border-mint"
          >
            <div>
              <div className="font-bold">{a.name}</div>
              <div className="text-sm text-muted">
                {a.debts.length} debt{a.debts.length === 1 ? "" : "s"} · {money(t.toPay)} going out
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${t.leftOver < 0 ? "text-neg" : "text-pos"}`}>{money(t.leftOver)}</div>
              <div className="text-xs text-muted">left of {money(t.salary)}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function Tile({ label, value, highlight, negative }: { label: string; value: string; highlight?: boolean; negative?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${highlight ? "border-brand bg-brand text-white" : "border-line bg-card"}`}>
      <div className={`text-[10.5px] font-semibold tracking-wider uppercase ${highlight ? "text-[#a9d3c2]" : "text-muted"}`}>{label}</div>
      <div className={`mt-1 text-xl font-bold ${negative ? "text-orange-300" : ""}`}>{value}</div>
    </div>
  );
}
