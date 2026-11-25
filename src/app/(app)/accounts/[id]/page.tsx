import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/auth";
import { getCycleView, getUser } from "@/lib/data";
import { cycleMonthLabel, pickCycle, shiftCycle } from "@/lib/cycle";
import { formatMoney } from "@/lib/money";
import { CycleSwitcher } from "@/components/cycle-switcher";
import { setPaidAction, setSalaryAction, updateEntryAction } from "../../actions";

export default async function AccountPage({ params, searchParams }: PageProps<"/accounts/[id]">) {
  const userId = await requireUserId();
  const { id } = await params;
  const user = await getUser(userId);
  const { cycle, current } = pickCycle((await searchParams).cycle, user.payday);
  const { accounts, totals } = await getCycleView(userId, cycle);
  const account = accounts.find((a) => a.id === id);
  if (!account) notFound();

  const t = totals.byAccount[account.id];
  const money = (cents: number) => formatMoney(cents, user.currency);
  const plain = (cents: number) => String(cents / 100);

  return (
    <div className="space-y-3">
      <Link href={`/dashboard${cycle === current ? "" : `?cycle=${cycle}`}`} className="text-sm text-muted">
        ‹ Home
      </Link>
      <h1 className="font-display text-3xl font-bold">{account.name}</h1>
      <CycleSwitcher cycle={cycle} current={current} payday={user.payday} basePath={`/accounts/${account.id}`} />

      <form action={setSalaryAction} key={`salary-${cycle}-${account.salary}`} className="card p-4">
        <input type="hidden" name="bankAccountId" value={account.id} />
        <input type="hidden" name="cycle" value={cycle} />
        <label htmlFor="salary" className="label">
          Salary this month
        </label>
        <div className="mt-2 flex gap-2">
          <input id="salary" name="salary" inputMode="decimal" required defaultValue={plain(account.salary)} className="field text-lg font-bold" />
          <button className="btn">Save</button>
        </div>
      </form>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Owed" value={money(t.owed)} />
        <Stat label="To pay" value={money(t.toPay)} />
        <div className="rounded-xl bg-brand p-3 text-white">
          <div className="text-[10px] font-semibold tracking-wider text-[#a9d3c2] uppercase">Left</div>
          <div className={`font-bold ${t.leftOver < 0 ? "text-orange-300" : ""}`}>{money(t.leftOver)}</div>
        </div>
      </div>

      <h2 className="label px-1 pt-2">Debts · tick when paid</h2>
      {account.debts.length === 0 && (
        <p className="card p-4 text-muted">
          No debts on this account this month. <Link href="/manage" className="font-semibold text-pos">Add one</Link>
        </p>
      )}
      {account.debts.map((d) => {
        const e = d.entry;
        const clearBy =
          e.balance === 0 ? "Paid off" : d.monthsLeft === null ? "Not at this rate" : `Clear by ${cycleMonthLabel(shiftCycle(cycle, d.monthsLeft - 1))}`;
        return (
          <div key={d.id} className="card p-4">
            <div className="flex items-center gap-3">
              <form action={setPaidAction}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="paid" value={e.paid ? "0" : "1"} />
                <button
                  aria-label={e.paid ? `Mark ${d.name} as not paid` : `Mark ${d.name} as paid`}
                  aria-pressed={e.paid}
                  className={`grid size-7 place-items-center rounded-lg border-2 font-bold ${e.paid ? "border-mint bg-mint text-brand" : "border-line"}`}
                >
                  {e.paid ? "✓" : ""}
                </button>
              </form>
              <div className={`flex-1 font-bold ${e.paid ? "text-muted line-through decoration-mint decoration-2" : ""}`}>
                {d.name}
                {d.closed && <span className="ml-2 text-xs font-semibold text-muted no-underline">(closed)</span>}
              </div>
              <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-muted">{clearBy}</span>
            </div>
            <form action={updateEntryAction} key={`${e.id}-${e.balance}-${e.installment}`} className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <input type="hidden" name="id" value={e.id} />
              <label className="block">
                <span className="label">Balance</span>
                <input name="balance" inputMode="decimal" required defaultValue={plain(e.balance)} className="field mt-1" />
              </label>
              <label className="block">
                <span className="label">Installment</span>
                <input name="installment" inputMode="decimal" required defaultValue={plain(e.installment)} className="field mt-1" />
              </label>
              <button className="btn-ghost">Save</button>
            </form>
            {d.interestRate !== null && <p className="mt-2 text-xs text-muted">{d.interestRate}% interest per year</p>}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] font-semibold tracking-wider text-muted uppercase">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
