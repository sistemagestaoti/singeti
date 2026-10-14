import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(roles);
  } catch (error: any) {
    console.error("GET /api/roles error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao listar perfis" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, permissions } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nome do perfil é obrigatório" }, { status: 400 });
    }

    const cleanName = name.trim().toUpperCase();

    const existing = await prisma.role.findUnique({
      where: { name: cleanName }
    });

    if (existing) {
      return NextResponse.json({ error: "Já existe um perfil com este nome." }, { status: 400 });
    }

    const role = await prisma.role.create({
      data: {
        name: cleanName,
        description: description?.trim() || null,
        permissions: typeof permissions === "string" ? permissions : JSON.stringify(permissions || {})
      },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error: any) {
    console.error("Role creation error:", error);
    return NextResponse.json({ error: "Erro ao criar perfil. O nome pode já existir." }, { status: 500 });
  }
}
