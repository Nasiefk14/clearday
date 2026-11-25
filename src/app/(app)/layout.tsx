import Link from "next/link";
import { requireUserId } from "@/auth";
import { Logo } from "@/components/logo";
import { signOutAction } from "./actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUserId();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-10">
      <header className="flex items-center justify-between gap-3 py-4">
        <Link href="/dashboard" aria-label="Clearday home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold">
          <Link href="/dashboard" className="rounded-lg px-3 py-2 hover:bg-card">
            Home
          </Link>
          <Link href="/manage" className="rounded-lg px-3 py-2 hover:bg-card">
            Manage
          </Link>
          <form action={signOutAction}>
            <button className="rounded-lg px-3 py-2 text-muted hover:bg-card">Sign out</button>
          </form>
        </nav>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
