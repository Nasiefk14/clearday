"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mt-6 p-6">
      <h2 className="text-2xl font-bold">That didn&apos;t work</h2>
      <p className="mt-2 text-muted">
        Check the amounts (numbers only, like 1500 or 1500.50) and try again. If it keeps happening, refresh the page.
      </p>
      <button onClick={reset} className="btn mt-4">
        Try again
      </button>
    </div>
  );
}
