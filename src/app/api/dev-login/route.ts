import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Local demo only: signs you in as the seeded demo user. Returns 404 anywhere except `next dev`.
export async function GET() {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });

  const user = await prisma.user.findUnique({ where: { email: "demo@clearday.local" } });
  if (!user) return new NextResponse("Run `npm run db:seed` first.", { status: 400 });

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });

  // Relative redirect so it works from localhost or a phone on the network.
  const res = new NextResponse(null, { status: 303, headers: { Location: "/dashboard" } });
  res.cookies.set("authjs.session-token", sessionToken, { httpOnly: true, sameSite: "lax", path: "/", expires });
  return res;
}
