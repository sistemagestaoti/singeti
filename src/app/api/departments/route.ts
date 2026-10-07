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
    const { name, company_id } = body;

    if (!name || !company_id) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const dept = await prisma.department.create({
      data: {
        name,
        company_id
      }
    });

    return NextResponse.json(dept, { status: 201 });
  } catch (error: any) {
    console.error("Department creation error:", error);
    return NextResponse.json({ error: "Erro ao criar departamento" }, { status: 500 });
  }
}
