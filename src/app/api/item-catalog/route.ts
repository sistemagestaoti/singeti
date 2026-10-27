import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/lib/currentUser";
import { areStringsEquivalent } from "@/lib/normalize";

const DEFAULT_ITEMS = [
  { name: "Mouse óptico sem fio USB", unit: "UN", category: "Hardware / Periférico", notes: "Acompanha pilha" },
  { name: "Teclado ABNT2 USB", unit: "UN", category: "Hardware / Periférico", notes: "Com teclado numérico" },
  { name: "Monitor 24 polegadas", unit: "UN", category: "Hardware / Periférico", notes: "Entrada HDMI e DisplayPort" },
  { name: "Cabo de rede Cat6 montado", unit: "UN", category: "Redes & Cabos", notes: "Patch cord 3 metros" },
  { name: "Cabo HDMI 2.0 blindado", unit: "UN", category: "Acessórios", notes: "2 metros" },
  { name: "Adaptador USB para Rede RJ45", unit: "UN", category: "Acessórios", notes: "Gigabit Ethernet" },
  { name: "Headset USB com cancelamento de ruído", unit: "UN", category: "Comunicação", notes: "Para reuniões e telefonia" },
  { name: "Filtro de linha 5 tomadas", unit: "UN", category: "Infraestrutura", notes: "Padrão ABNT 10A" },
  { name: "Toner Preto para Impressora", unit: "UN", category: "Consumíveis", notes: "Alta capacidade" },
  { name: "Memória RAM DDR4 16GB", unit: "UN", category: "Componentes", notes: "3200MHz" },
  { name: "SSD NVMe M.2 512GB", unit: "UN", category: "Componentes", notes: "Alta performance" },
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let items = await prisma.itemCatalog.findMany({
      orderBy: { name: "asc" }
    });

    // Se o catálogo estiver vazio, semeia os itens mais frequentes
    if (items.length === 0) {
      for (const item of DEFAULT_ITEMS) {
        await prisma.itemCatalog.create({ data: item });
      }
      items = await prisma.itemCatalog.findMany({
        orderBy: { name: "asc" }
      });
    }

    return NextResponse.json(items);
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
