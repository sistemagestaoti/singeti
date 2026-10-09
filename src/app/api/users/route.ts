import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, password, job_title, phone, status, role_id, department_id, company_id, avatar } = body;

    if (!name || !email || !password || !role_id || !company_id) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: "E-mail já está em uso" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: hashedPassword,
        job_title: job_title || null,
        phone: phone || null,
        status,
        role_id,
        department_id: department_id || null,
        company_id,
        avatar: avatar || null
      }
    });

    // Enviar notificação de senha
    const { sendPasswordNotification } = await import("@/lib/mailer");
    await sendPasswordNotification(email, name, true);

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: any) {
    console.error("User creation error:", error);
    return NextResponse.json({ error: "Erro ao cadastrar usuário" }, { status: 500 });
  }
}
