import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureManualsSeeded } from "@/lib/manualsSeed";

export const dynamic = "force-dynamic";

// GET: List all manuals or filter by module/search query
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    await ensureManualsSeeded();

    const { searchParams } = new URL(request.url);
    const moduleFilter = searchParams.get("module");
    const query = searchParams.get("q")?.toLowerCase().trim();

    const where: any = {
      status: "PUBLISHED",
    };

    if (moduleFilter && moduleFilter !== "ALL") {
      where.module = moduleFilter;
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { tags: { contains: query, mode: "insensitive" } },
        { content_markdown: { contains: query, mode: "insensitive" } },
      ];
    }

    const manuals = await prisma.systemManual.findMany({
      where,
      orderBy: [{ order_index: "asc" }, { title: "asc" }],
      include: {
        article: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(manuals);
  } catch (error: any) {
    console.error("GET /api/manuals error:", error);
    return NextResponse.json({ error: "Erro ao buscar manuais" }, { status: 500 });
  }
}

// POST: Create or link manual (Admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { module, submodule, context_key, route_pattern, title, description, content_markdown, version, tags } = body;

    if (!module || !context_key || !title) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const manual = await prisma.systemManual.create({
      data: {
        module: module.trim(),
        submodule: submodule ? submodule.trim() : null,
        context_key: context_key.trim(),
        route_pattern: route_pattern ? route_pattern.trim() : `/${module.trim()}`,
        title: title.trim(),
        description: description ? description.trim() : null,
        content_markdown: content_markdown ? content_markdown.trim() : null,
        version: version || "1.0",
        tags: tags || "",
        status: "PUBLISHED",
        pdf_url: `/api/manuals/${encodeURIComponent(context_key.trim())}/pdf`,
        file_name: `${title.trim().replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
        file_size: 45_000,
      },
    });

    return NextResponse.json(manual, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/manuals error:", error);
    return NextResponse.json({ error: "Erro ao criar manual", details: error?.message }, { status: 500 });
  }
}
