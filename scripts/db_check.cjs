const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  console.log('=== USERS ===');
  console.log(JSON.stringify(users, null, 2));

  const ticketsCount = await prisma.ticket.count();
  console.log('\n=== TICKETS COUNT:', ticketsCount, '===');

  const tickets = await prisma.ticket.findMany({
    take: 3,
    orderBy: { created_at: 'desc' },
    include: {
      items: true,
      comments: {
        include: { author: { select: { id: true, name: true } } }
      },
      requester: { select: { id: true, name: true } },
      assigned_to: { select: { id: true, name: true } }
    }
  });
  console.log('\n=== SAMPLE TICKETS ===');
  console.log(JSON.stringify(tickets, null, 2));

  await prisma['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
