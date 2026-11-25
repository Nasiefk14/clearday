import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { isAllowed } from "@/lib/access";
import { Logo } from "@/components/logo";

export default async function Landing() {
  const session = await auth();
  if (session?.user && isAllowed(session.user.email)) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col bg-brand px-4 text-white">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col py-6">
        <Logo light />
        <h1 className="mt-16 font-display text-5xl leading-[1.05] font-bold">
          Know exactly when you&apos;ll be <span className="text-mint">debt-free.</span>
        </h1>
        <p className="mt-5 text-lg text-[#cfe6dc]">
          Free, private and simple. Track what you owe, see what&apos;s left of your salary, and count down to zero.
        </p>
        <ol className="mt-6 space-y-2 text-[#cfe6dc]">
          {["Add your accounts and salary", "Add what you owe", "Tick it off, and watch the date move"].map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-mint/20 text-xs font-bold text-mint">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <form
          className="mt-10"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-4 font-bold text-ink hover:opacity-90">
            <span aria-hidden className="size-5 rounded-full bg-[conic-gradient(#ea4335_0_25%,#fbbc05_0_50%,#34a853_0_75%,#4285f4_0)]" />
            Sign in with Google
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[#9fc4b4]">No bank logins. Your numbers stay yours.</p>
      </div>
    </main>
  );
}
