import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

function isAuthorizedAdmin(session: any): boolean {
  return !!session?.user;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!role) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error: any) {
    console.error("GET /api/roles/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao consultar perfil" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorizedAdmin(session)) {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores podem editar perfis." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, permissions } = body;

    const existingRole = await prisma.role.findUnique({ where: { id } });
    if (!existingRole) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    const updateData: any = {};
    if (name && name.trim()) {
      const cleanName = name.trim().toUpperCase();
      // Não permite renomear se já houver outro perfil com mesmo nome
      const duplicate = await prisma.role.findFirst({
        where: {
          name: cleanName,
          NOT: { id }
        }
      });
      if (duplicate) {
        return NextResponse.json({ error: "Já existe outro perfil com este nome." }, { status: 400 });
      }
      updateData.name = cleanName;
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (permissions !== undefined) {
      updateData.permissions = typeof permissions === "string" ? permissions : JSON.stringify(permissions);
    }

    const updated = await prisma.role.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { users: true } }
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/roles/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao atualizar perfil" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorizedAdmin(session)) {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores podem excluir perfis." }, { status: 403 });
    }

    const { id } = await params;
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } }
      }
    });

    if (!role) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    // Proteção de segurança: Não excluir o perfil mestre ADMINISTRADOR
    if (role.name === "ADMINISTRADOR") {
      return NextResponse.json({ error: "O perfil mestre ADMINISTRADOR não pode ser excluído." }, { status: 400 });
    }

    // Proteção de integridade referencial: Não excluir se houver colaboradores vinculados
    if (role._count.users > 0) {
      return NextResponse.json({
        error: `Não é possível excluir este perfil porque existem ${role._count.users} usuário(s) associado(s) a ele. Reatribua os usuários antes de excluir.`
      }, { status: 400 });
    }

    await prisma.role.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Perfil excluído com sucesso." });
  } catch (error: any) {
    console.error("DELETE /api/roles/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao excluir perfil" }, { status: 500 });
  }
}
