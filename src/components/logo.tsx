export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 font-display text-lg font-bold ${light ? "text-white" : "text-ink"}`}>
      <span aria-hidden className="relative size-6 rounded-full bg-mint">
        <span className="absolute inset-1.5 -rotate-45 rounded-full border-[3px] border-brand border-t-transparent" />
      </span>
      Clearday
    </span>
  );
}
