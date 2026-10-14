import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    
    const { resolveCurrentUser } = await import("@/lib/currentUser");
    const user = await resolveCurrentUser(session);
    if (!user) throw new Error("Usuário não encontrado");

    const dataToSave = { ...body };

    dataToSave.user_id = user.id;

    if (!dataToSave.asset_id) {
      let asset = await prisma.asset.findFirst({ where: { company_id: user.company_id } });
      if (!asset) {
        asset = await prisma.asset.create({
          data: {
            internal_id: "AST-BKG-01",
            name: "Equipamento Geral / Sala de Reunião",
            type: "OTHER",
            status: "IN_USE",
            company_id: user.company_id,
          }
        });
      }
      dataToSave.asset_id = asset.id;
    }

    if (!dataToSave.start_time) dataToSave.start_time = new Date();
    else dataToSave.start_time = new Date(dataToSave.start_time);

    if (!dataToSave.end_time) dataToSave.end_time = new Date(Date.now() + 3600000);
    else dataToSave.end_time = new Date(dataToSave.end_time);

    const newRecord = await prisma.booking.create({
      data: dataToSave
    });

    return NextResponse.json(newRecord);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message, { status: 500 });
  }
}
