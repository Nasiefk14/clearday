import Link from "next/link";
import { formatCycle, shiftCycle, type Cycle } from "@/lib/cycle";

export function CycleSwitcher({ cycle, current, payday, basePath }: { cycle: Cycle; current: Cycle; payday: number; basePath: string }) {
  const prev = shiftCycle(cycle, -1);
  const next = shiftCycle(cycle, 1);
  const arrow = "grid size-9 place-items-center rounded-lg text-xl text-muted hover:bg-paper";
  return (
    <div className="card flex items-center justify-between px-2 py-1.5">
      <Link href={`${basePath}?cycle=${prev}`} className={arrow} aria-label="Previous month">
        ‹
      </Link>
      <div className="text-center">
        <div className="font-semibold">{formatCycle(cycle, payday)}</div>
        {cycle !== current && (
          <Link href={basePath} className="text-xs font-semibold text-pos">
            Back to this month
          </Link>
        )}
      </div>
      {next <= current ? (
        <Link href={`${basePath}?cycle=${next}`} className={arrow} aria-label="Next month">
          ›
        </Link>
      ) : (
        <span className={`${arrow} opacity-30`} aria-hidden>
          ›
        </span>
      )}
    </div>
  );
}
