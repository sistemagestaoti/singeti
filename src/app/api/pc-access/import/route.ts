import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCurrentUser } from "@/lib/currentUser";
import { logPcAccessAudit } from "@/lib/vault";

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
    const { rows, dry_run = false } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Nenhum registro para importar" }, { status: 400 });
    }

    // Busca patrimônios e hostnames existentes para validação rápida
    const [existingAssets, existingComputers] = await Promise.all([
      prisma.asset.findMany({
        where: { type: "COMPUTER", asset_tag: { not: null } },
        select: { asset_tag: true },
      }),
      prisma.computer.findMany({
        where: { hostname: { not: null } },
        select: { hostname: true },
      }),
    ]);

    const existingTagsSet = new Set(
      existingAssets.map((a) => a.asset_tag?.toLowerCase().trim()).filter(Boolean)
    );
    const existingHostnamesSet = new Set(
      existingComputers.map((c) => c.hostname?.toLowerCase().trim()).filter(Boolean)
    );

    const validRows: any[] = [];
    const errors: Array<{ row_number: number; error: string; raw: any }> = [];

    // Busca total de assets para gerar internal_id sequencial
    let startCodeNumber = (await prisma.asset.count({ where: { type: "COMPUTER" } })) + 1;

    // Cache local dos setores e unidades para vínculo
    const departments = await prisma.department.findMany({ select: { id: true, name: true } });
    const locations = await prisma.location.findMany({ select: { id: true, name: true } });

    rows.forEach((row: any, idx: number) => {
      const rowNum = idx + 1;
      const name = (row.name || row.hostname || `PC-${row.asset_tag || rowNum}`).toString().trim();
      const asset_tag = row.asset_tag ? row.asset_tag.toString().trim() : null;
      const hostname = row.hostname ? row.hostname.toString().trim() : null;

      if (!name) {
        errors.push({ row_number: rowNum, error: "Nome ou Hostname é obrigatório", raw: row });
        return;
      }

      if (asset_tag && existingTagsSet.has(asset_tag.toLowerCase())) {
        errors.push({
          row_number: rowNum,
          error: `Patrimônio "${asset_tag}" já cadastrado no sistema.`,
          raw: row,
        });
        return;
      }

      if (hostname && existingHostnamesSet.has(hostname.toLowerCase())) {
        errors.push({
          row_number: rowNum,
          error: `Hostname "${hostname}" já cadastrado no sistema.`,
          raw: row,
        });
        return;
      }

      // Adiciona ao set para evitar duplicatas dentro da própria planilha
      if (asset_tag) existingTagsSet.add(asset_tag.toLowerCase());
      if (hostname) existingHostnamesSet.add(hostname.toLowerCase());

      // Vincula setor e unidade se houver match por nome
      const deptMatch = departments.find(
        (d) => d.name.toLowerCase() === (row.department_name || "").toString().toLowerCase().trim()
      );
      const locMatch = locations.find(
        (l) => l.name.toLowerCase() === (row.location_name || "").toString().toLowerCase().trim()
      );

      validRows.push({
        name,
        asset_tag,
        hostname: hostname || name.toUpperCase().replace(/\s+/g, "-"),
        manufacturer: row.manufacturer ? row.manufacturer.toString().trim() : null,
        model: row.model ? row.model.toString().trim() : null,
        serial_number: row.serial_number ? row.serial_number.toString().trim() : null,
        device_type: row.device_type ? row.device_type.toString().trim().toUpperCase() : "DESKTOP",
        status: row.status ? row.status.toString().trim().toUpperCase() : "IN_USE",
        os_name: row.os_name ? row.os_name.toString().trim() : null,
        os_version: row.os_version ? row.os_version.toString().trim() : null,
        processor: row.processor ? row.processor.toString().trim() : null,
        memory_mb: row.memory_mb ? Number(row.memory_mb) : null,
        storage_gb: row.storage_gb ? Number(row.storage_gb) : null,
        ip_address: row.ip_address ? row.ip_address.toString().trim() : null,
        mac_address: row.mac_address ? row.mac_address.toString().trim() : null,
        domain_workgroup: row.domain_workgroup ? row.domain_workgroup.toString().trim() : "WORKGROUP",
        physical_location: row.physical_location ? row.physical_location.toString().trim() : null,
        department_id: deptMatch?.id || null,
        location_id: locMatch?.id || null,
        collaborator_name: row.collaborator_name ? row.collaborator_name.toString().trim() : null,
        collaborator_email: row.collaborator_email ? row.collaborator_email.toString().trim().toLowerCase() : null,
        notes: row.notes ? row.notes.toString().trim() : "Importado via planilha de inventário",
      });
    });

    // Se for apenas Dry Run (prévia e validação)
    if (dry_run) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        total_received: rows.length,
        valid_count: validRows.length,
        error_count: errors.length,
        errors,
        preview_sample: validRows.slice(0, 5),
      });
    }

    // Executa a importação real em lote
    let importedCount = 0;
    for (const item of validRows) {
      const internal_id = `PC-${String(startCodeNumber++).padStart(4, "0")}`;

      await prisma.$transaction(async (tx) => {
        const asset = await tx.asset.create({
          data: {
            internal_id,
            asset_tag: item.asset_tag,
            name: item.name,
            type: "COMPUTER",
            status: item.status,
            manufacturer: item.manufacturer,
            model: item.model,
            serial_number: item.serial_number,
            department_id: item.department_id,
            location_id: item.location_id,
            company_id: currentUser.company_id,
            notes: item.notes,
          },
        });

        const computer = await tx.computer.create({
          data: {
            asset_id: asset.id,
            hostname: item.hostname,
            device_type: item.device_type,
            os_name: item.os_name,
            os_version: item.os_version,
            processor: item.processor,
            memory_mb: item.memory_mb,
            storage_gb: item.storage_gb,
            ip_address: item.ip_address,
            mac_address: item.mac_address,
            domain_workgroup: item.domain_workgroup,
            physical_location: item.physical_location,
          },
        });

        // Se veio colaborador associado, cria ou localiza e vincula
        if (item.collaborator_name) {
          let collab = await tx.pcCollaborator.findFirst({
            where: {
              OR: [
                { name: { equals: item.collaborator_name, mode: "insensitive" as const } },
                ...(item.collaborator_email
                  ? [{ email: { equals: item.collaborator_email, mode: "insensitive" as const } }]
                  : []),
              ],
            },
          });

          if (!collab) {
            collab = await tx.pcCollaborator.create({
              data: {
                name: item.collaborator_name,
                email: item.collaborator_email,
                company_id: currentUser.company_id,
                status: "ACTIVE",
              },
            });
          }

          await tx.pcUserAssignment.create({
            data: {
              computer_id: computer.id,
              collaborator_id: collab.id,
              is_primary: true,
              status: "ACTIVE",
              assigned_by: currentUser.name,
              notes: "Importação em lote de inventário",
            },
          });
        }
      });

      importedCount++;
    }

    await logPcAccessAudit({
      action: "IMPORT_INVENTORY",
      entityType: "INVENTORY",
      user: currentUser,
      details: `Importação em lote concluída: ${importedCount} computadores importados com sucesso. Linhas com erro: ${errors.length}`,
    });

    return NextResponse.json({
      success: true,
      dry_run: false,
      imported_count: importedCount,
      errors_count: errors.length,
      errors,
    });
  } catch (error: any) {
    console.error("Erro na importação de inventário:", error);
    return NextResponse.json({ error: error.message || "Erro na importação" }, { status: 500 });
  }
}
