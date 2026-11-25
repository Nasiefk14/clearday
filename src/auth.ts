import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAllowed } from "@/lib/access";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  // Database sessions: stored server-side, so they can be revoked by deleting the row.
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/", error: "/" },
  callbacks: {
    // Runs before the user row is created, so people not on the list never get stored.
    signIn({ profile }) {
      if (!profile?.email_verified) return false;
      return isAllowed(profile.email) ? true : "/waitlist";
    },
  },
});

/** The signed-in, allowed user's id, or a redirect to the landing page. Use in every protected page and action. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id || !isAllowed(session.user.email)) redirect("/");
  return session.user.id;
}
