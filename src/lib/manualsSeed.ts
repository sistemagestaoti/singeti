import { prisma } from "@/lib/prisma";
import { OFFICIAL_MANUALS_CATALOG } from "@/lib/manualsCatalog";

export async function ensureManualsSeeded() {
  try {
    const count = await prisma.systemManual.count();
    if (count >= OFFICIAL_MANUALS_CATALOG.length) {
      return;
    }

    // Busca ou cria uma empresa padrão para os artigos da Wiki vinculados
    let defaultCompany = await prisma.company.findFirst();
    if (!defaultCompany) {
      defaultCompany = await prisma.company.create({
        data: {
          corporate_name: "SYNGETI Corporativo",
          trade_name: "SYNGETI",
          cnpj: "00.000.000/0001-00",
        },
      });
    }

    // Busca autor padrão (admin)
    const adminUser = await prisma.user.findFirst({
      where: { status: { in: ["ACTIVE", "active"] } },
      orderBy: { created_at: "asc" },
    });

    for (const manual of OFFICIAL_MANUALS_CATALOG) {
      const existing = await prisma.systemManual.findFirst({
        where: { context_key: manual.context_key },
      });

      if (!existing) {
        // Cria também um artigo na Wiki TI correspondente para pesquisa integrada
        let articleId: string | null = null;
        if (adminUser && defaultCompany) {
          const article = await prisma.knowledgeArticle.create({
            data: {
              title: manual.title,
              content: manual.content_markdown,
              category: "MANUAL",
              status: "PUBLISHED",
              is_public: true,
              author_id: adminUser.id,
              company_id: defaultCompany.id,
            },
          });
          articleId = article.id;
        }

        await prisma.systemManual.create({
          data: {
            module: manual.module,
            submodule: manual.submodule,
            context_key: manual.context_key,
            route_pattern: manual.route_pattern,
            title: manual.title,
            description: manual.description,
            version: manual.version,
            status: manual.status,
            tags: manual.tags,
            order_index: manual.order_index,
            content_markdown: manual.content_markdown,
            file_name: `${manual.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
            file_size: 45_000,
            pdf_url: `/api/manuals/${manual.context_key}/pdf`,
            article_id: articleId,
          },
        });
      }
    }
  } catch (error) {
    console.warn("Aviso ao inicializar catálogo de manuais oficiais:", error);
  }
}
