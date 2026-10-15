import { AuthenticatedShell } from "@/components/AuthenticatedShell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";

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
  const branding = getBranding();

  return (
    <AuthenticatedShell
      userName={session.user.name || "Admin"}
      userAvatar={userAvatar}
      initialBranding={branding}
    >
      {children}
    </AuthenticatedShell>
  );
}
