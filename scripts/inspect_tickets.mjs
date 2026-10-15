import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.ticket.count();
  console.log(`Total de tickets no banco: ${count}`);
  const tickets = await prisma.ticket.findMany({
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assigned_to: { select: { id: true, name: true, email: true } },
      category: true,
      department: true,
      items: true,
      comments: true,
    },
    orderBy: { created_at: 'desc' }
  });
  console.log("TICKETS:", JSON.stringify(tickets, null, 2));
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("ERRO:", err);
  process.exit(1);
});
