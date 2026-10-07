import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    
    // Generate a unique internal ID
    const count = await prisma.asset.count();
    const internal_id = `AST-${String(count + 1).padStart(4, '0')}`;

    const asset = await prisma.asset.create({
      data: {
        internal_id,
        name: body.name,
        type: body.type,
        asset_tag: body.asset_tag || null,
        manufacturer: body.manufacturer || null,
        model: body.model || null,
        status: body.status,
        company_id: body.company_id,
        location_id: body.location_id || null,
        department_id: body.department_id || null,
      }
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error: any) {
    console.error("Asset creation error:", error);
    return NextResponse.json({ error: "Erro ao criar ativo" }, { status: 500 });
  }
}
