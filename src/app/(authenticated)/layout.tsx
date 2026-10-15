import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { SessionGuard } from "@/components/SessionGuard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Memoiza a busca de avatar por ciclo de render (evita queries duplicadas na mesma request)
const getUserAvatar = cache(async (userId: string): Promise<string | null> => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });
    return dbUser?.avatar || null;
  } catch {
    return null;
  }
});

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Busca avatar com cache por ciclo de render
  const userAvatar = session.user?.id ? await getUserAvatar(session.user.id) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SessionGuard />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar userName={session.user.name || "Admin"} avatar={userAvatar} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
