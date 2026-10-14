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
    if (!dataToSave.code) dataToSave.code = "PB-" + Date.now();
    
    
    
    
    
    

    const newRecord = await prisma.problem.create({
      data: dataToSave
    });

    return NextResponse.json(newRecord);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message, { status: 500 });
  }
}
