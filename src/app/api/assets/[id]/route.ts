import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'TECHNICIAN')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    
    // Validate minimum required fields
    if (!data.name || !data.type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updateData: any = {
      name: data.name,
      type: data.type,
      asset_tag: data.asset_tag || null,
      manufacturer: data.manufacturer || null,
      model: data.model || null,
      serial_number: data.serial_number || null,
      status: data.status || 'IN_USE',
      company_id: data.company_id || null,
      location_id: data.location_id || null,
      department_id: data.department_id || null,
      user_id: data.user_id || null,
      purchase_date: data.purchase_date ? new Date(data.purchase_date) : null,
      warranty_end: data.warranty_end ? new Date(data.warranty_end) : null,
      purchase_value: data.purchase_value ? parseFloat(data.purchase_value) : null,
      notes: data.notes || null,
    };

    if (data.type === 'COMPUTER') {
      updateData.computer = {
        upsert: {
          create: {
            ip_address: data.ip_address || null,
            mac_address: data.mac_address || null,
            os_name: data.os_name || null,
            processor: data.processor || null,
            memory_mb: data.memory_mb ? parseInt(data.memory_mb) : null,
            storage_gb: data.storage_gb ? parseInt(data.storage_gb) : null,
          },
          update: {
            ip_address: data.ip_address || null,
            mac_address: data.mac_address || null,
            os_name: data.os_name || null,
            processor: data.processor || null,
            memory_mb: data.memory_mb ? parseInt(data.memory_mb) : null,
            storage_gb: data.storage_gb ? parseInt(data.storage_gb) : null,
          }
        }
      };
    } else {
      // If changed type from computer to something else, we could delete it, but Prisma will handle the relationship. Let's just leave it or delete it if needed. We'll leave it for now.
    }

    const updated = await prisma.asset.update({
      where: { id: resolvedParams.id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating asset:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Número de patrimônio já cadastrado." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized. Admins only." }, { status: 401 });
  }

  try {
    await prisma.asset.delete({ where: { id: resolvedParams.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting asset:", error);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
