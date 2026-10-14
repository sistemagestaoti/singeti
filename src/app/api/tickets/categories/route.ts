import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

const DEFAULT_CATEGORIES = [
  { name: "Hardware & Equipamentos", description: "Computadores, notebooks, monitores e periféricos" },
  { name: "Software & Sistemas", description: "Sistemas corporativos, ERP, Office e aplicativos" },
  { name: "Redes & Conectividade", description: "Wi-Fi, Internet, rede cabeada e VPN" },
  { name: "Acessos & Segurança", description: "Criação de usuário, redefinição de senha e permissões de pasta" },
  { name: "Impressão & Periféricos", description: "Impressoras de rede, toners e scanners" },
  { name: "Telefonia & Comunicação", description: "Ramais telefônicos, headsets e videoconferência" },
  { name: "Solicitação de Itens / Peças", description: "Novos periféricos, cabos, adaptadores e componentes" },
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let categories = await prisma.ticketCategory.findMany({
      orderBy: { name: "asc" }
    });

    // Se ainda não existirem categorias, semeia as padrões automaticamente
    if (categories.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await prisma.ticketCategory.create({
          data: cat
        });
      }
      categories = await prisma.ticketCategory.findMany({
        orderBy: { name: "asc" }
      });
    }

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("GET /api/tickets/categories error:", error);
    return NextResponse.json({ error: "Erro ao listar categorias" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Nome da categoria é obrigatório" }, { status: 400 });
    }

    // Verifica se já existe
    const existing = await prisma.ticketCategory.findFirst({
      where: { name: name.trim() }
    });

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const category = await prisma.ticketCategory.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tickets/categories error:", error);
    return NextResponse.json({ error: "Erro ao criar categoria" }, { status: 500 });
  }
}
