const fs = require('fs');
const path = require('path');

const modules = [
  { name: 'Problem', route: 'problems' },
  { name: 'Change', route: 'changes' },
  { name: 'Contract', route: 'contracts' },
  { name: 'Supplier', route: 'suppliers' },
  { name: 'Project', route: 'projects' },
  { name: 'KnowledgeArticle', route: 'knowledge' },
  { name: 'Booking', route: 'bookings' },
];

const apiDir = path.join(__dirname, 'src', 'app', 'api');

modules.forEach(mod => {
  const modDir = path.join(apiDir, mod.route, '[id]');
  if (!fs.existsSync(modDir)) fs.mkdirSync(modDir, { recursive: true });

  const apiCode = `import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const resolvedParams = await params;
    const body = await req.json();

    const updatedRecord = await prisma.${mod.name.charAt(0).toLowerCase() + mod.name.slice(1)}.update({
      where: { id: resolvedParams.id },
      data: body
    });

    return NextResponse.json(updatedRecord);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const resolvedParams = await params;
    
    await prisma.${mod.name.charAt(0).toLowerCase() + mod.name.slice(1)}.delete({
      where: { id: resolvedParams.id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message, { status: 500 });
  }
}
`;
  fs.writeFileSync(path.join(modDir, `route.ts`), apiCode);
});

console.log("API actions (PUT/DELETE) scaffolded.");
