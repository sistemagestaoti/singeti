import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    let userId = "";
    if (params) {
      const resolved = await params;
      userId = resolved?.id;
    }
    if (!userId || userId === "undefined") {
      const url = new URL(req.url);
      userId = url.pathname.split("/").filter(Boolean).pop() || "";
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, department: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const { password_hash, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    console.error("GET user error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao buscar usuário" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    let userId = "";
    if (params) {
      const resolved = await params;
      userId = resolved?.id;
    }

    const body = await req.json().catch(() => ({}));
    if (!userId || userId === "undefined") {
      userId = body.id;
    }
    if (!userId || userId === "undefined") {
      const url = new URL(req.url);
      userId = url.pathname.split("/").filter(Boolean).pop() || "";
    }

    if (!userId || userId === "undefined") {
      return NextResponse.json({ error: "ID do usuário não fornecido" }, { status: 400 });
    }

    const { name, email, password, job_title, phone, status, role_id, department_id, avatar } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (email !== undefined) dataToUpdate.email = email;
    if (job_title !== undefined) dataToUpdate.job_title = job_title || null;
    if (phone !== undefined) dataToUpdate.phone = phone || null;
    if (status !== undefined) dataToUpdate.status = status;
    if (role_id !== undefined) dataToUpdate.role_id = role_id;
    if (department_id !== undefined) {
      dataToUpdate.department_id = (department_id && typeof department_id === "string" && department_id.trim() !== "") ? department_id.trim() : null;
    }
    if (avatar !== undefined) dataToUpdate.avatar = avatar || null;

    if (password && typeof password === "string" && password.trim() !== "") {
      dataToUpdate.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    if (password && typeof password === "string" && password.trim() !== "") {
      try {
        const { sendPasswordNotification } = await import("@/lib/mailer");
        await sendPasswordNotification(updatedUser.email, updatedUser.name, false);
      } catch (mailErr) {
        console.error("Aviso: Falha ao enviar notificação de senha por e-mail:", mailErr);
      }
    }

    const { password_hash, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error: any) {
    console.error("User update error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Este e-mail já está em uso por outro usuário." }, { status: 400 });
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Usuário não encontrado para edição." }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || "Erro ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    let userId = "";
    if (params) {
      const resolved = await params;
      userId = resolved?.id;
    }
    if (!userId || userId === "undefined") {
      const url = new URL(req.url);
      userId = url.pathname.split("/").filter(Boolean).pop() || "";
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("User delete error:", error);
    return NextResponse.json({ error: "Erro ao excluir usuário (verifique se ele possui vínculos no sistema)" }, { status: 500 });
  }
}
