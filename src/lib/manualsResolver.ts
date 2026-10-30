import { prisma } from "@/lib/prisma";
import { ensureManualsSeeded } from "@/lib/manualsSeed";
import { estimateManualPdfPages } from "@/lib/pdfGenerator";

export interface ResolvedManualResult {
  exactMatch: boolean;
  manual: {
    id: string;
    module: string;
    submodule: string | null;
    contextKey: string;
    routePattern: string;
    title: string;
    description: string | null;
    version: string;
    pdfUrl: string;
    fileName: string;
    fileSize: number | null;
    contentMarkdown: string | null;
    articleId: string | null;
    pageCount: number;
  } | null;
  relatedManuals: Array<{
    id: string;
    title: string;
    contextKey: string;
    version: string;
    pdfUrl: string;
  }>;
}

/**
 * Resolução de Contexto de Ajuda Hierárquico:
 * 1. Modal / Sub-contexto específico (ex: "connect/stickers", "service-desk/new")
 * 2. Rota exata da subaba (ex: "/service-desk/new")
 * 3. Módulo principal (ex: "service-desk", "connect", "cmdb")
 * 4. Fallback amigável se não encontrado.
 */
export async function resolveContextManual(
  pathname: string,
  explicitContext?: string | null
): Promise<ResolvedManualResult> {
  await ensureManualsSeeded();

  // Limpa rota (ex: "/service-desk/new" -> ["service-desk", "new"])
  const cleanPath = (pathname || "/").split("?")[0].replace(/\/$/, "");
  const segments = cleanPath.split("/").filter(Boolean);

  const moduleName = segments[0] || "dashboard";
  const subName = segments[1] || null;

  // Monta chaves candidatas por ordem de especificidade
  const candidates: string[] = [];

  if (explicitContext && explicitContext.trim()) {
    candidates.push(explicitContext.trim().toLowerCase());
  }

  if (subName) {
    // Se for ID dinâmico (ex: cuid, uuid ou id numérico), trata como "[id]" ou "detail"
    const isDynamicId =
      /^c[a-z0-9]{20,}$/i.test(subName) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(subName) ||
      /^\d+$/.test(subName) ||
      (subName.startsWith("cm") && subName.length >= 15);

    if (isDynamicId) {
      candidates.push(`${moduleName}/[id]`);
      candidates.push(`${moduleName}/detail`);
    } else {
      candidates.push(`${moduleName}/${subName}`);
    }
  }

  candidates.push(moduleName);

  // Busca manuais publicados no banco de dados ordenados pela versão mais recente
  const publishedManuals = await prisma.systemManual.findMany({
    where: {
      status: "PUBLISHED",
    },
    orderBy: [
      { order_index: "asc" },
      { version: "desc" },
    ],
  });

  let bestManual: any = null;
  let exactMatch = false;

  // 1. Tenta correspondência pelos candidatos priorizados (Override -> Sub-aba -> Módulo)
  for (const cand of candidates) {
    const match = publishedManuals.find(
      (m) =>
        m.context_key.toLowerCase() === cand ||
        m.route_pattern.toLowerCase() === cand ||
        m.route_pattern.toLowerCase() === `/${cand}`
    );
    if (match) {
      bestManual = match;
      // Se tinha uma subaba solicitada mas casou apenas com o módulo raiz, é um fallback de módulo
      if (subName && !explicitContext && cand === moduleName) {
        exactMatch = false;
      } else {
        exactMatch = true;
      }
      break;
    }
  }

  // 2. Se ainda não encontrou, tenta por rota exata da URL limpa
  if (!bestManual) {
    const routeMatch = publishedManuals.find(
      (m) => m.route_pattern.toLowerCase() === cleanPath.toLowerCase()
    );
    if (routeMatch) {
      bestManual = routeMatch;
      exactMatch = true;
    }
  }

  // 3. Se não achou exato pelo contexto ou rota, tenta fallback para o módulo principal
  if (!bestManual) {
    bestManual = publishedManuals.find((m) => m.module.toLowerCase() === moduleName) || null;
    exactMatch = false;
  }

  // Lista de manuais correlacionados do mesmo módulo para seleção rápida
  const relatedManuals = publishedManuals
    .filter((m) => m.module.toLowerCase() === moduleName && (!bestManual || m.id !== bestManual.id))
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      title: m.title,
      contextKey: m.context_key,
      version: m.version,
      pdfUrl: m.pdf_url || `/api/manuals/${encodeURIComponent(m.context_key)}/pdf`,
    }));

  if (!bestManual) {
    return {
      exactMatch: false,
      manual: null,
      relatedManuals,
    };
  }

  return {
    exactMatch,
    manual: {
      id: bestManual.id,
      module: bestManual.module,
      submodule: bestManual.submodule,
      contextKey: bestManual.context_key,
      routePattern: bestManual.route_pattern,
      title: bestManual.title,
      description: bestManual.description,
      version: bestManual.version,
      pdfUrl: bestManual.pdf_url || `/api/manuals/${encodeURIComponent(bestManual.context_key)}/pdf`,
      fileName: bestManual.file_name || `${bestManual.title}.pdf`,
      fileSize: bestManual.file_size || null,
      contentMarkdown: bestManual.content_markdown,
      articleId: bestManual.article_id,
      pageCount: estimateManualPdfPages(bestManual.content_markdown),
    },
    relatedManuals,
  };
}
