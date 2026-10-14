import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/lib/currentUser";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const departments = await prisma.department.findMany({
      include: {
        location: true,
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(departments);
  } catch (error: any) {
    console.error("GET /api/departments error:", error);
    return NextResponse.json({ error: "Erro ao listar departamentos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = await resolveCurrentUser(session);
    const body = await req.json();
    const { name, location_id } = body;
    let { company_id } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Nome do setor/departamento é obrigatório" }, { status: 400 });
    }

    if (!company_id) {
      company_id = user?.company_id || (await prisma.company.findFirst())?.id;
    }

    if (!company_id) {
      return NextResponse.json({ error: "Nenhuma empresa associada encontrada" }, { status: 400 });
    }

    // Checar se já existe no mesmo company
    const existing = await prisma.department.findFirst({
      where: {
        name: name.trim(),
        company_id
      }
    });

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const dept = await prisma.department.create({
      data: {
        name: name.trim(),
        company_id,
        location_id: location_id || null
      }
    });

    return NextResponse.json(dept, { status: 201 });
  } catch (error: any) {
    console.error("Department creation error:", error);
    return NextResponse.json({ error: "Erro ao criar departamento" }, { status: 500 });
  }
}
