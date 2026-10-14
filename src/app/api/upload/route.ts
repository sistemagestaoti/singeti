import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Validar tipo de imagem
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (file.type && !validMimes.includes(file.type)) {
      return NextResponse.json({ error: "Formato de arquivo inválido. Use JPG, PNG ou WebP." }, { status: 400 });
    }

    // Limite de 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "A imagem não pode exceder 5MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Converte para Data URI seguro e persistente no banco de dados (elimina erro EROFS na Vercel)
    const mimeType = file.type || "image/png";
    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

    // Tenta gravar localmente apenas em ambiente com disco gravável (desenvolvimento local)
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.name) || ".png";
      const filename = `avatar-${uniqueSuffix}${ext}`;
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
    } catch {
      // Ignora erro de sistema de arquivos somente-leitura na Vercel
    }

    return NextResponse.json({ url: dataUri });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao fazer upload" }, { status: 500 });
  }
}
