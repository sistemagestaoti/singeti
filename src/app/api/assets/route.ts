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

    const assetData: any = {
      internal_id,
      name: body.name,
      type: body.type,
      asset_tag: body.asset_tag || null,
      manufacturer: body.manufacturer || null,
      model: body.model || null,
      serial_number: body.serial_number || null,
      status: body.status,
      purchase_date: body.purchase_date ? new Date(body.purchase_date) : null,
      warranty_end: body.warranty_end ? new Date(body.warranty_end) : null,
      purchase_value: body.purchase_value ? parseFloat(body.purchase_value) : null,
      notes: body.notes || null,
      company_id: body.company_id,
      location_id: body.location_id || null,
      department_id: body.department_id || null,
      user_id: body.user_id || null,
    };

    if (body.type === 'COMPUTER') {
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
