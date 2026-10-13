import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  let dbUser = null;
  try {
    if (session.user?.id) {
      dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { avatar: true }
      });
    }
  } catch (err) {
    console.warn("Aviso ao buscar avatar do usuário:", err);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar userName={session.user.name || "Admin"} avatar={dbUser?.avatar} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
