"use client";

import { useRef } from "react";

/** A bottom sheet built on <dialog>: Esc and the backdrop close it, focus stays inside while open. */
export function Sheet({
  trigger,
  triggerClassName = "",
  label,
  children,
}: {
  trigger: React.ReactNode;
  triggerClassName?: string;
  label: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" aria-label={label} className={triggerClassName} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        aria-label={label}
        // Close when tapping the dimmed backdrop (the dialog element itself, outside the panel).
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        // Close as soon as a form inside is submitted; the page refreshes with the saved numbers.
        onSubmit={() => ref.current?.close()}
        className="mx-auto mt-auto mb-0 w-full max-w-md rounded-t-[28px] bg-card p-0 text-ink backdrop:bg-black/50"
      >
        <div className="px-5 pt-3 pb-8">
          <div aria-hidden className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
          {children}
        </div>
      </dialog>
    </>
  );
}
