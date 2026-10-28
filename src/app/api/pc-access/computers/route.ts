import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCurrentUser } from "@/lib/currentUser";
import { logPcAccessAudit } from "@/lib/vault";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const deviceType = searchParams.get("device_type")?.trim() || "";
    const departmentId = searchParams.get("department_id")?.trim() || "";
    const locationId = searchParams.get("location_id")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      type: "COMPUTER",
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (departmentId && departmentId !== "ALL") {
      where.department_id = departmentId;
    }

    if (locationId && locationId !== "ALL") {
      where.location_id = locationId;
    }

    if (deviceType && deviceType !== "ALL") {
      where.computer = {
        ...where.computer,
        device_type: deviceType,
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { internal_id: { contains: search, mode: "insensitive" } },
        { asset_tag: { contains: search, mode: "insensitive" } },
        { serial_number: { contains: search, mode: "insensitive" } },
        { manufacturer: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        {
          computer: {
            OR: [
              { hostname: { contains: search, mode: "insensitive" } },
              { ip_address: { contains: search, mode: "insensitive" } },
              { physical_location: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          computer: {
            include: {
              assignments: {
                where: { status: "ACTIVE" },
                include: {
                  collaborator: true,
                },
                orderBy: { is_primary: "desc" },
              },
              accounts: {
                select: {
                  id: true,
                  username: true,
                  account_type: true,
                  status: true,
                  vault_secret_id: true,
                },
              },
              email_accounts: {
                select: {
                  id: true,
                  email_address: true,
                  provider: true,
                  status: true,
                },
              },
            },
          },
          department: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updated_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    // Formata retorno enxuto e seguro para a listagem
    const items = assets.map((asset) => {
      const pc = asset.computer;
      const primaryAssignment = pc?.assignments.find((a) => a.is_primary) || pc?.assignments[0];
      const primaryUser = primaryAssignment?.collaborator || asset.user;

      return {
        id: asset.id,
        computer_id: pc?.id || null,
        internal_id: asset.internal_id,
        asset_tag: asset.asset_tag,
        name: asset.name,
        status: asset.status,
        manufacturer: asset.manufacturer,
        model: asset.model,
        serial_number: asset.serial_number,
        hostname: pc?.hostname || null,
        ip_address: pc?.ip_address || null,
        mac_address: pc?.mac_address || null,
        os_name: pc?.os_name || null,
        os_version: pc?.os_version || null,
        processor: pc?.processor || null,
        memory_mb: pc?.memory_mb || null,
        storage_gb: pc?.storage_gb || null,
        device_type: pc?.device_type || "DESKTOP",
        domain_workgroup: pc?.domain_workgroup || "WORKGROUP",
        physical_location: pc?.physical_location || null,
        department: asset.department,
        location: asset.location,
        primary_user: primaryUser
          ? {
              id: primaryUser.id,
              name: primaryUser.name,
              email: (primaryUser as any).email || null,
              job_title: (primaryUser as any).job_title || null,
            }
          : null,
        users_count: pc?.assignments.length || (asset.user ? 1 : 0),
        accounts_count: pc?.accounts.length || 0,
        emails_count: pc?.email_accounts.length || 0,
        has_secrets: pc?.accounts.some((a) => !!a.vault_secret_id) || false,
        updated_at: asset.updated_at,
        created_at: asset.created_at,
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    });
  } catch (error: any) {
    console.error("Erro ao listar computadores:", error);
    return NextResponse.json({ error: "Erro ao buscar computadores" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const currentUser = await resolveCurrentUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "Usuário atual não encontrado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      asset_tag,
      hostname,
      serial_number,
      manufacturer,
      model,
      device_type = "DESKTOP",
      status = "IN_USE",
      os_name,
      os_version,
      processor,
      memory_mb,
      storage_gb,
      ip_address,
      mac_address,
      domain_workgroup = "WORKGROUP",
      physical_location,
      location_id,
      department_id,
      notes,
      primary_collaborator_id,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "O nome do computador é obrigatório" }, { status: 400 });
    }

    // Se não fornecido asset_tag ou internal_id, gerar código sequencial seguro
    let internal_id = body.internal_id?.trim();
    if (!internal_id) {
      const count = await prisma.asset.count({ where: { type: "COMPUTER" } });
      internal_id = `PC-${String(count + 1).padStart(4, "0")}`;
    }

    // Valida duplicidade de internal_id e asset_tag se fornecido
    const existingCode = await prisma.asset.findUnique({ where: { internal_id } });
    if (existingCode) {
      internal_id = `PC-${Date.now().toString().slice(-6)}`;
    }

    if (asset_tag) {
      const existingTag = await prisma.asset.findFirst({
        where: { asset_tag: asset_tag.trim() },
      });
      if (existingTag) {
        return NextResponse.json(
          { error: `O patrimônio "${asset_tag}" já está cadastrado no sistema.` },
          { status: 400 }
        );
      }
    }

    // Cria o Asset e o Computer em transação
    const result = await prisma.$transaction(async (tx) => {
      const newAsset = await tx.asset.create({
        data: {
          internal_id,
          asset_tag: asset_tag ? asset_tag.trim() : null,
          name: name.trim(),
          type: "COMPUTER",
          status,
          manufacturer: manufacturer?.trim() || null,
          model: model?.trim() || null,
          serial_number: serial_number?.trim() || null,
          department_id: department_id || null,
          location_id: location_id || null,
          company_id: currentUser.company_id,
          notes: notes?.trim() || null,
        },
      });

      const newComputer = await tx.computer.create({
        data: {
          asset_id: newAsset.id,
          hostname: hostname?.trim() || name.trim().toUpperCase().replace(/\s+/g, "-"),
          os_name: os_name?.trim() || null,
          os_version: os_version?.trim() || null,
          processor: processor?.trim() || null,
          memory_mb: memory_mb ? Number(memory_mb) : null,
          storage_gb: storage_gb ? Number(storage_gb) : null,
          ip_address: ip_address?.trim() || null,
          mac_address: mac_address?.trim() || null,
          device_type,
          domain_workgroup: domain_workgroup?.trim() || "WORKGROUP",
          physical_location: physical_location?.trim() || null,
        },
      });

      // Se foi selecionado colaborador principal inicial
      if (primary_collaborator_id) {
        await tx.pcUserAssignment.create({
          data: {
            computer_id: newComputer.id,
            collaborator_id: primary_collaborator_id,
            is_primary: true,
            status: "ACTIVE",
            assigned_by: currentUser.name,
            notes: "Vínculo inicial no cadastro do equipamento",
          },
        });
      }

      return { asset: newAsset, computer: newComputer };
    });

    // Registra auditoria
    await logPcAccessAudit({
      action: "CREATE_COMPUTER",
      entityType: "COMPUTER",
      entityId: result.asset.id,
      entityName: `${result.asset.name} (${result.asset.internal_id})`,
      user: currentUser,
      details: `Computador criado com sucesso. Hostname: ${result.computer.hostname || 'N/A'}, Tipo: ${result.computer.device_type}`,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao cadastrar computador:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao cadastrar computador" },
      { status: 500 }
    );
  }
}
