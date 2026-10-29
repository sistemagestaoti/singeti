import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveContextManual } from "@/lib/manualsResolver";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "/dashboard";
    const context = searchParams.get("context") || null;

    const result = await resolveContextManual(path, context);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/manuals/context error:", error);
    return NextResponse.json(
      { error: "Erro ao resolver manual de ajuda", details: error?.message },
      { status: 500 }
    );
  }
}
