import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    
    // To satisfy Prisma required relations that aren't in the form
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) throw new Error("User not found");

    const dataToSave = { ...body };

    // Inject company_id and other relations if needed by schema:
    
    
    dataToSave.company_id = user.company_id;
dataToSave.code = "CT-" + Date.now();
dataToSave.start_date = new Date();
dataToSave.end_date = new Date();
dataToSave.supplier_id = (await prisma.supplier.findFirst({where: {company_id: user.company_id}}))?.id || "unknown";
    
    
    
    

    const newRecord = await prisma.contract.create({
      data: dataToSave
    });

    return NextResponse.json(newRecord);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message, { status: 500 });
  }
}
