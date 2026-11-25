// A cycle is "YYYY-MM": from payday in that month to the day before next month's payday.
// shortcut: dates use UTC, so a cycle can flip up to a few hours early/late for users far from UTC; store a user timezone if that matters.

export type Cycle = string;

const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const paydayIn = (y: number, m0: number, payday: number) => Math.min(payday, daysIn(y, m0));

export function isCycle(value: unknown): value is Cycle {
  if (typeof value !== "string") return false;
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  return !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12;
}

function parts(cycle: Cycle) {
  if (!isCycle(cycle)) throw new Error(`Invalid cycle: ${cycle}`);
  return { y: Number(cycle.slice(0, 4)), m0: Number(cycle.slice(5, 7)) - 1 };
}

export function cycleFor(date: Date, payday: number): Cycle {
  let y = date.getUTCFullYear();
  let m0 = date.getUTCMonth();
  if (date.getUTCDate() < paydayIn(y, m0, payday)) {
    m0 -= 1;
    if (m0 < 0) [m0, y] = [11, y - 1];
  }
  return `${y}-${pad(m0 + 1)}`;
}

export function shiftCycle(cycle: Cycle, months: number): Cycle {
  const { y, m0 } = parts(cycle);
  const t = y * 12 + m0 + months;
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`;
}

const startOf = (cycle: Cycle, payday: number) => {
  const { y, m0 } = parts(cycle);
  return new Date(Date.UTC(y, m0, paydayIn(y, m0, payday)));
};

export function cycleRange(cycle: Cycle, payday: number) {
  const start = startOf(cycle, payday);
  const end = new Date(startOf(shiftCycle(cycle, 1), payday).getTime() - 86_400_000);
  return { start, end };
}

/** The due date of a debt (day of month) inside a cycle: the first matching day on or after payday. */
export function dueDateIn(cycle: Cycle, payday: number, dueDay: number): Date {
  const { start } = cycleRange(cycle, payday);
  const y = start.getUTCFullYear();
  const m0 = start.getUTCMonth();
  const inStartMonth = new Date(Date.UTC(y, m0, Math.min(dueDay, daysIn(y, m0))));
  if (inStartMonth >= start) return inStartMonth;
  return new Date(Date.UTC(y, m0 + 1, Math.min(dueDay, daysIn(y, m0 + 1))));
}

export function formatCycle(cycle: Cycle, payday: number): string {
  const { start, end } = cycleRange(cycle, payday);
  const f = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${f(start)} – ${f(end)}`;
}

/** "Oct 2027" for the month a cycle starts in. */
export function cycleMonthLabel(cycle: Cycle): string {
  const { y, m0 } = parts(cycle);
  return new Date(Date.UTC(y, m0, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** The cycle to show: the requested one if valid and not in the future, otherwise the current one. */
export function pickCycle(requested: unknown, payday: number, now = new Date()): { cycle: Cycle; current: Cycle } {
  const current = cycleFor(now, payday);
  const cycle = isCycle(requested) && requested <= current ? requested : current;
  return { cycle, current };
}
