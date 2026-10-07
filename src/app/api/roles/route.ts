import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, permissions } = body;

    if (!name) {
      return NextResponse.json({ error: "Nome do perfil é obrigatório" }, { status: 400 });
    }

    const role = await prisma.role.create({
      data: {
        name,
        description: description || null,
        permissions: permissions || "[]"
      }
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error: any) {
    console.error("Role creation error:", error);
    return NextResponse.json({ error: "Erro ao criar perfil. O nome pode já existir." }, { status: 500 });
  }
}
