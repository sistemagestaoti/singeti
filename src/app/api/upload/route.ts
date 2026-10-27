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

    // Validar tipos permitidos de mídia e documentos
    const validMimes = [
      // Imagens
      "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
      // Vídeos
      "video/mp4", "video/webm", "video/ogg", "video/quicktime",
      // Áudio (gravações de voz e sons)
      "audio/webm", "audio/ogg", "audio/mp3", "audio/mpeg", "audio/wav", "audio/aac",
      // Documentos corporativos
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
      "application/zip", "application/x-zip-compressed",
      "text/plain", "text/csv",
    ];

    // Permite upload se o mimeType for válido ou se for extensão segura
    const fileName = file.name || "arquivo";
    const ext = path.extname(fileName).toLowerCase();
    const safeExtensions = [
      ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg",
      ".mp4", ".webm", ".ogg", ".mov",
      ".mp3", ".wav", ".aac",
      ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".txt", ".csv", ".zip"
    ];

    const isSafeExtension = safeExtensions.includes(ext);
    const isValidMime = file.type ? validMimes.includes(file.type) : isSafeExtension;

    if (!isValidMime && !isSafeExtension) {
      return NextResponse.json({ 
        error: "Formato de arquivo não suportado. Utilize imagens, vídeos, áudios, PDFs ou documentos do Office." 
      }, { status: 400 });
    }

    // Limite configurável de 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "O arquivo não pode exceder 25MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Converte para Data URI seguro e persistente no banco de dados (elimina erro EROFS na Vercel)
    const mimeType = file.type || "application/octet-stream";
    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

    // Tenta gravar localmente apenas em ambiente com disco gravável (desenvolvimento local)
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const safeFilename = `file-${uniqueSuffix}${ext || ".bin"}`;
      const filepath = path.join(uploadDir, safeFilename);
      await writeFile(filepath, buffer);
    } catch {
      // Ignora erro de sistema de arquivos somente-leitura na Vercel
    }

    return NextResponse.json({ 
      url: dataUri,
      name: fileName,
      size: file.size,
      type: mimeType
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao fazer upload" }, { status: 500 });
  }
}
