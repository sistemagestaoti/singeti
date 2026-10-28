import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/lib/currentUser";
import { areStringsEquivalent } from "@/lib/normalize";

let cachedDepartments: any[] | null = null;
let departmentsCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

export function invalidateDepartmentsCache() {
  cachedDepartments = null;
  departmentsCacheTime = 0;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const now = Date.now();
    if (cachedDepartments && now - departmentsCacheTime < CACHE_TTL_MS) {
      return NextResponse.json(cachedDepartments, {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      });
    }

    const departments = await prisma.department.findMany({
      include: {
        location: true,
      },
      orderBy: { name: "asc" }
    });

    cachedDepartments = departments;
    departmentsCacheTime = now;

    return NextResponse.json(departments, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
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

    invalidateDepartmentsCache();

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

    // Checar se já existe no mesmo company (comparação tolerante a maiúsculas/minúsculas e acentos)
    const allInCompany = await prisma.department.findMany({ where: { company_id } });
    const existing = allInCompany.find(d => areStringsEquivalent(d.name, name));

    if (existing) {
      return NextResponse.json({ ...existing, _alreadyExisted: true }, { status: 200 });
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
