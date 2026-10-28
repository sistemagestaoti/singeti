import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { areStringsEquivalent } from "@/lib/normalize";
import { getUnifiedRequesters, invalidateRequestersCache } from "@/lib/requesters";

export { invalidateRequestersCache };

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";

    const filtered = await getUnifiedRequesters(search);

    return NextResponse.json(filtered, {
      headers: {
        "Cache-Control": "private, max-age=45, stale-while-revalidate=180",
      },
    });
  } catch (error: any) {
    console.error("GET /api/requesters error:", error);
    return NextResponse.json({ error: "Erro ao listar solicitantes" }, { status: 500 });
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
    const email = body.email?.trim() || null;
    const phone = body.phone?.trim() || null;
    const job_title = body.job_title?.trim() || null;
    const department_name = body.department_name?.trim() || null;

    if (!name) {
      return NextResponse.json({ error: "Nome do solicitante é obrigatório" }, { status: 400 });
    }

    // 1. Prevenção contra duplicidades (busca case/accent insensitive em requesters)
    const allRequesters = await prisma.requester.findMany();
    const duplicateRequester = allRequesters.find(r => areStringsEquivalent(r.name, name));

    if (duplicateRequester) {
      return NextResponse.json({
        ...duplicateRequester,
        is_system_user: false,
        source: "REQUESTER",
        _alreadyExisted: true,
      }, { status: 200 });
    }

    // Também verifica se já existe nos usuários do sistema
    const allUsers = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
    const duplicateUser = allUsers.find(u => areStringsEquivalent(u.name, name));
    if (duplicateUser) {
      return NextResponse.json({
        id: duplicateUser.id,
        name: duplicateUser.name,
        email: duplicateUser.email,
        is_system_user: true,
        source: "USER",
        _alreadyExisted: true,
      }, { status: 200 });
    }

    // 2. Criação limpa de Solicitante Manual (SEM LOGIN, SEM SENHA, SEM ACESSO)
    const newRequester = await prisma.requester.create({
      data: {
        name,
        email,
        phone,
        job_title,
        department_name,
        company_id: currentUser?.company_id || null,
        created_by: currentUser?.id || session.user.id || null,
      }
    });

    invalidateRequestersCache();

    return NextResponse.json({
      ...newRequester,
      is_system_user: false,
      source: "REQUESTER",
      _isNew: true,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/requesters error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao cadastrar solicitante" }, { status: 500 });
  }
}
