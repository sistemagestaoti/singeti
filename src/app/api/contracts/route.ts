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

    dataToSave.company_id = user.company_id;
    if (!dataToSave.code) dataToSave.code = "CT-" + Date.now();
    if (!dataToSave.start_date) dataToSave.start_date = new Date();
    else dataToSave.start_date = new Date(dataToSave.start_date);
    if (!dataToSave.end_date) dataToSave.end_date = new Date(Date.now() + 365 * 24 * 3600 * 1000);
    else dataToSave.end_date = new Date(dataToSave.end_date);

    if (!dataToSave.supplier_id) {
      let supplier = await prisma.supplier.findFirst({ where: { company_id: user.company_id } });
      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: {
            name: "Fornecedor Padrão de Tecnologia",
            company_id: user.company_id,
            status: "ACTIVE"
          }
        });
      }
      dataToSave.supplier_id = supplier.id;
    }
    
    
    
    

    const newRecord = await prisma.contract.create({
      data: dataToSave
    });

    return NextResponse.json(newRecord);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message, { status: 500 });
  }
}
