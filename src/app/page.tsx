import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { isAllowed } from "@/lib/access";
import { Logo } from "@/components/logo";

export default async function Landing() {
  const session = await auth();
  if (session?.user && isAllowed(session.user.email)) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col bg-night px-5 text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col py-6">
        <Logo />
        <h1 className="mt-16 text-5xl leading-[1.02] font-bold tracking-tighter">
          Know exactly when you&apos;ll be <span className="text-lime">debt-free.</span>
        </h1>
        <p className="mt-5 text-lg text-[#8b90a0]">
          Free, private and simple. Track what you owe, see what&apos;s left of your salary, and count down to zero.
        </p>
        <div aria-hidden className="mt-8 flex gap-1">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} className={`h-5 flex-1 rounded-md ${i < 3 ? "bg-lime" : "bg-[#1c2029]"}`} />
          ))}
        </div>
        <form
          className="mt-auto pt-10"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button className="btn w-full py-4 text-base">Sign in with Google</button>
        </form>
        <p className="mt-4 text-center text-sm text-[#8b90a0]">No bank logins. Your numbers stay yours.</p>
        {process.env.NODE_ENV === "development" && (
          <a href="/api/dev-login" className="mt-4 rounded-2xl border border-lime/40 px-4 py-3 text-center font-semibold text-lime">
            Sign in as demo (local only)
          </a>
        )}
      </div>
    </main>
  );
}
