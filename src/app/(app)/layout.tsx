import { requireUserId } from "@/auth";
import { getUser } from "@/lib/data";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getUser(await requireUserId());
  return (
    <div
      data-style={user.style.toLowerCase()}
      data-appearance={user.appearance.toLowerCase()}
      className="flex min-h-dvh flex-1 flex-col bg-paper font-sans text-ink"
    >
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-6 pb-12">{children}</main>
    </div>
  );
}
