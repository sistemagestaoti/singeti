import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { KnowledgeClient } from "@/components/knowledge/KnowledgeClient";
import { ensureManualsSeeded } from "@/lib/manualsSeed";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Garante que o catálogo oficial de manuais esteja semeado no banco de dados
  await ensureManualsSeeded();

  const [manuals, articles] = await Promise.all([
    prisma.systemManual.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ order_index: "asc" }, { title: "asc" }],
    }),
    prisma.knowledgeArticle.findMany({
      where: { category: { not: "MANUAL" } },
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { view_count: "desc" },
    }),
  ]);

  const serializedManuals = manuals.map((m) => ({
    id: m.id,
    module: m.module,
    submodule: m.submodule,
    context_key: m.context_key,
    route_pattern: m.route_pattern,
    title: m.title,
    description: m.description,
    version: m.version,
    tags: m.tags,
    pdf_url: m.pdf_url,
    file_name: m.file_name,
    file_size: m.file_size,
    content_markdown: m.content_markdown,
    updated_at: m.updated_at.toISOString(),
  }));

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <KnowledgeClient
        initialManuals={serializedManuals}
        articles={articles}
      />
    </div>
  );
}
