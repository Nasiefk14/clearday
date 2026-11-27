import Link from "next/link";
import { requireUserId } from "@/auth";
import { getUser } from "@/lib/data";
import { CURRENCIES } from "@/lib/options";
import { signOutAction, updatePreferenceAction, updateSettingsAction } from "../actions";

export default async function SettingsPage() {
  const user = await getUser(await requireUserId());

  return (
    <>
      <Link href="/dashboard" className="text-sm text-muted">
        ‹ Home
      </Link>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Settings</h1>

      <Group title="Style">
        <form action={updatePreferenceAction} className="grid grid-cols-2 gap-2.5">
          <StyleOption value="BOLD" label="Bold" selected={user.style === "BOLD"}>
            <div className="h-24 rounded-xl bg-night p-2 text-left">
              <p className="text-lg font-bold text-lime">31%</p>
              <div className="mt-1 flex gap-0.5">
                {[1, 1, 0, 0, 0, 0].map((on, i) => (
                  <i key={i} className={`h-1.5 flex-1 rounded-sm ${on ? "bg-lime" : "bg-[#1c2029]"}`} />
                ))}
              </div>
              <div className="mt-1.5 h-2.5 rounded bg-[#151821]" />
              <div className="mt-1 h-2.5 rounded bg-[#151821]" />
            </div>
          </StyleOption>
          <StyleOption value="PLAYFUL" label="Playful" selected={user.style === "PLAYFUL"}>
            <div className="h-24 rounded-xl bg-[#f4f5f7] p-2 text-left font-[family-name:var(--font-nunito)]">
              <div className="h-10 rounded-lg bg-lime p-1.5 text-sm font-black text-night">31%</div>
              <div className="mt-1.5 h-3 rounded-md bg-white" />
              <div className="mt-1 h-3 rounded-md bg-white" />
            </div>
          </StyleOption>
        </form>
      </Group>

      <Group title="Appearance">
        <form action={updatePreferenceAction} className="card flex p-1">
          {(["SYSTEM", "LIGHT", "DARK"] as const).map((a) => (
            <button
              key={a}
              name="appearance"
              value={a}
              aria-pressed={user.appearance === a}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize ${user.appearance === a ? "bg-lime text-night" : "text-muted"}`}
            >
              {a.toLowerCase()}
            </button>
          ))}
        </form>
      </Group>

      <Group title="Money">
        <form action={updateSettingsAction} className="card grid grid-cols-2 gap-3 p-4">
          <label className="block">
            <span className="label">Payday (day of month)</span>
            <input name="payday" type="number" min={1} max={31} required defaultValue={user.payday} className="field mt-1" />
          </label>
          <label className="block">
            <span className="label">Currency</span>
            <select name="currency" defaultValue={user.currency} className="field mt-1">
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button className="btn col-span-2">Save</button>
        </form>
      </Group>

      <Group title="Your data">
        <Link href="/manage" className="card flex justify-between p-4 font-semibold">
          Bank accounts &amp; debts <span className="text-muted">›</span>
        </Link>
        <form action={signOutAction}>
          <button className="card mt-1.5 flex w-full justify-between p-4 font-semibold">
            Sign out <span className="text-muted">›</span>
          </button>
        </form>
      </Group>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mx-1 mt-6 mb-2 text-xs font-semibold tracking-widest text-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

function StyleOption({ value, label, selected, children }: { value: string; label: string; selected: boolean; children: React.ReactNode }) {
  return (
    <button
      name="style"
      value={value}
      aria-pressed={selected}
      className={`rounded-2xl border-2 bg-card p-2.5 text-center text-sm font-bold ${selected ? "border-tick-on" : "border-line"}`}
    >
      {children}
      <span className="mt-2 block">
        {label}
        {selected && " ✓"}
      </span>
    </button>
  );
}
