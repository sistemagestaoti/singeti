import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { areStringsEquivalent } from "@/lib/normalize";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const assets = await prisma.asset.findMany({
      include: {
        computer: true,
        department: true,
        location: true,
        user: true,
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(assets);
  } catch (error: any) {
    console.error("GET /api/assets error:", error);
    return NextResponse.json({ error: "Erro ao listar ativos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    
    // Prevenção de duplicidade por patrimônio (asset_tag) ou nome idêntico
    if (body.asset_tag && body.asset_tag.trim()) {
      const existingTag = await prisma.asset.findFirst({
        where: { asset_tag: body.asset_tag.trim() }
      });
      if (existingTag) {
        return NextResponse.json({ ...existingTag, _alreadyExisted: true }, { status: 200 });
      }
    } else if (body.name && body.name.trim()) {
      const allAssets = await prisma.asset.findMany({ select: { id: true, name: true, internal_id: true, asset_tag: true } });
      const existing = allAssets.find(a => areStringsEquivalent(a.name, body.name.trim()));
      if (existing) {
        return NextResponse.json({ ...existing, _alreadyExisted: true }, { status: 200 });
      }
    }

    // Generate a unique internal ID
    const count = await prisma.asset.count();
    const internal_id = `AST-${String(count + 1).padStart(4, '0')}`;

    const defaultCompany = await prisma.company.findFirst();

    const assetData: any = {
      internal_id,
      name: body.name || "Novo Equipamento",
      type: body.type || "OTHER",
      asset_tag: body.asset_tag || null,
      manufacturer: body.manufacturer || null,
      model: body.model || null,
      serial_number: body.serial_number || null,
      status: body.status || "IN_USE",
      purchase_date: body.purchase_date ? new Date(body.purchase_date) : null,
      warranty_end: body.warranty_end ? new Date(body.warranty_end) : null,
      purchase_value: body.purchase_value ? parseFloat(body.purchase_value) : null,
      notes: body.notes || null,
      company_id: body.company_id || defaultCompany?.id,
      location_id: body.location_id || null,
      department_id: body.department_id || null,
      user_id: body.user_id || null,
    };

    if (body.type === 'COMPUTER' && (body.ip_address || body.mac_address || body.os_name || body.processor || body.memory_mb || body.storage_gb)) {
      assetData.computer = {
        create: {
          ip_address: body.ip_address || null,
          mac_address: body.mac_address || null,
          os_name: body.os_name || null,
          processor: body.processor || null,
          memory_mb: body.memory_mb ? parseInt(body.memory_mb) : null,
          storage_gb: body.storage_gb ? parseInt(body.storage_gb) : null,
        }
      };
    }

    const asset = await prisma.asset.create({
      data: assetData
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error: any) {
    console.error("Asset creation error:", error);
    return NextResponse.json({ error: "Erro ao criar ativo" }, { status: 500 });
  }
}
