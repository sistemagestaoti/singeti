import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateManualPdf } from "@/lib/pdfGenerator";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const resolvedParams = await params;
    const rawKey = decodeURIComponent(resolvedParams.key);

    const manual = await prisma.systemManual.findFirst({
      where: {
        OR: [
          { id: rawKey },
          { context_key: rawKey },
          { context_key: rawKey.replace(/_/g, "/") },
        ],
      },
    });

    if (!manual) {
      return new NextResponse("Manual não encontrado", { status: 404 });
    }

    const pdfBytes = generateManualPdf({
      title: manual.title,
      module: manual.module,
      version: manual.version,
      contentMarkdown: manual.content_markdown || manual.description || manual.title,
    });

    const safeFilename = `${manual.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_v${manual.version}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("GET /api/manuals/[key]/pdf error:", error);
    return new NextResponse("Erro ao gerar PDF do manual", { status: 500 });
  }
}
