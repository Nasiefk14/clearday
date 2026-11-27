import Link from "next/link";
import { Logo } from "@/components/logo";

export default function Waitlist() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Logo />
      <h1 className="mt-8 text-3xl font-bold">You&apos;re on the list</h1>
      <p className="mt-3 text-muted">
        Clearday is invite-only while it&apos;s being built. Your Google account isn&apos;t on the invite list yet. Ask
        for an invite and you&apos;ll be able to sign in as soon as you&apos;re added.
      </p>
      <Link href="/" className="btn-ghost mt-8 self-start">
        Back
      </Link>
    </main>
  );
}
