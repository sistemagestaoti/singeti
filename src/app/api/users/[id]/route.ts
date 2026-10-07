import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const resolvedParams = await params;
    const body = await req.json();
    const { name, email, password, job_title, phone, status, role_id, department_id, avatar } = body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (email) dataToUpdate.email = email;
    if (job_title !== undefined) dataToUpdate.job_title = job_title || null;
    if (phone !== undefined) dataToUpdate.phone = phone || null;
    if (status) dataToUpdate.status = status;
    if (role_id) dataToUpdate.role_id = role_id;
    if (department_id !== undefined) dataToUpdate.department_id = department_id || null;
    if (avatar !== undefined) dataToUpdate.avatar = avatar || null;

    if (password) {
      dataToUpdate.password_hash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: dataToUpdate
    });

    const { password_hash, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error: any) {
    console.error("User update error:", error);
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const resolvedParams = await params;

    // Inactivate instead of hard delete, or just delete it if the user wants hard delete.
    // The prompt says "coloque botoes de editar/excluir /inativar". 
    // We'll implement hard delete here, but the UI might offer Inactivate too (via PUT).
    await prisma.user.delete({
      where: { id: resolvedParams.id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("User delete error:", error);
    return NextResponse.json({ error: "Erro ao excluir usuário (verifique se ele possui vínculos no sistema)" }, { status: 500 });
  }
}
