import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/lib/currentUser";
import { areStringsEquivalent } from "@/lib/normalize";
import { getUnifiedCatalogItems, invalidateCatalogCache } from "@/lib/itemCatalog";

export { invalidateCatalogCache };

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const items = await getUnifiedCatalogItems();

    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error: any) {
    console.error("GET /api/item-catalog error:", error);
    return NextResponse.json({ error: "Erro ao listar itens do catálogo" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    invalidateCatalogCache();

    const currentUser = await resolveCurrentUser(session);
    const body = await req.json();
    const name = body.name?.trim();
    const unit = body.unit?.trim() || "UN";
    const category = body.category?.trim() || null;
    const notes = body.notes?.trim() || null;

    if (!name) {
      return NextResponse.json({ error: "Nome/descrição do item é obrigatório" }, { status: 400 });
    }

    // Prevenção contra duplicidades
    const all = await prisma.itemCatalog.findMany();
    const existing = all.find(i => areStringsEquivalent(i.name, name));

    if (existing) {
      return NextResponse.json({
        ...existing,
        _alreadyExisted: true,
      }, { status: 200 });
    }

    const created = await prisma.itemCatalog.create({
      data: {
        name,
        unit,
        category,
        notes,
        company_id: currentUser?.company_id || null,
      }
    });

    return NextResponse.json({
      ...created,
      _isNew: true,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/item-catalog error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao adicionar item ao catálogo" }, { status: 500 });
  }
}
