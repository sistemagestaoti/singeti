import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      include: {
        role: true,
        department: true,
      },
      orderBy: { name: "asc" },
    });

    const safeUsers = users.map(({ password_hash, ...u }) => u);
    return NextResponse.json(safeUsers);
  } catch (error: any) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao listar usuários" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, email, password, job_title, phone, status, role_id, department_id, company_id, avatar } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios" }, { status: 400 });
    }

    // Fallback company_id if not supplied
    let targetCompanyId = company_id;
    if (!targetCompanyId || targetCompanyId.trim() === "") {
      const defaultCompany = await prisma.company.findFirst();
      targetCompanyId = defaultCompany?.id;
    }

    if (!targetCompanyId) {
      return NextResponse.json({ error: "Nenhuma empresa cadastrada no sistema para vincular o usuário" }, { status: 400 });
    }

    // Fallback role_id if not supplied
    let targetRoleId = role_id;
    if (!targetRoleId || targetRoleId.trim() === "") {
      const defaultRole = await prisma.role.findFirst({ where: { name: "USUARIO" } }) || await prisma.role.findFirst();
      targetRoleId = defaultRole?.id;
    }

    if (!targetRoleId) {
      return NextResponse.json({ error: "Nenhum perfil de acesso configurado no sistema" }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json({ error: "E-mail já está em uso" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: hashedPassword,
        job_title: (job_title && job_title.trim() !== "") ? job_title.trim() : null,
        phone: (phone && phone.trim() !== "") ? phone.trim() : null,
        status: status || "ACTIVE",
        role_id: targetRoleId,
        department_id: (department_id && typeof department_id === "string" && department_id.trim() !== "") ? department_id.trim() : null,
        company_id: targetCompanyId,
        avatar: (avatar && avatar.trim() !== "") ? avatar.trim() : null
      }
    });

    // Enviar notificação de senha de forma não-bloqueante
    try {
      const { sendPasswordNotification } = await import("@/lib/mailer");
      await sendPasswordNotification(user.email, user.name, true);
    } catch (mailErr) {
      console.error("Aviso: Falha ao enviar e-mail de nova conta (ignorado):", mailErr);
    }

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: any) {
    console.error("User creation error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Este e-mail já está cadastrado no sistema." }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || "Erro ao cadastrar usuário" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, name, email, password, job_title, phone, status, role_id, department_id, avatar } = body;

    if (!id) {
      return NextResponse.json({ error: "ID do usuário é obrigatório para atualização" }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (email !== undefined) dataToUpdate.email = email.trim().toLowerCase();
    if (job_title !== undefined) dataToUpdate.job_title = job_title ? job_title.trim() : null;
    if (phone !== undefined) dataToUpdate.phone = phone ? phone.trim() : null;
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
      where: { id },
      data: dataToUpdate
    });

    if (password && typeof password === "string" && password.trim() !== "") {
      try {
        const { sendPasswordNotification } = await import("@/lib/mailer");
        await sendPasswordNotification(updatedUser.email, updatedUser.name, false);
      } catch (mailErr) {
        console.error("Aviso: Falha ao enviar e-mail de alteração de senha (ignorado):", mailErr);
      }
    }

    const { password_hash, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error: any) {
    console.error("User update error in /api/users PUT:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Este e-mail já está em uso por outro usuário." }, { status: 400 });
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || "Erro ao atualizar usuário" }, { status: 500 });
  }
}
