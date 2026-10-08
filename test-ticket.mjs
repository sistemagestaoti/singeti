import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const count = await prisma.ticket.count();
  const code = `CH-${String(count + 1).padStart(7, '0')}`;
  
  const user = await prisma.user.findFirst();

  try {
    const ticket = await prisma.ticket.create({
      data: {
        code,
        title: "Test Error",
        description: "Test Desc",
        type: "INCIDENT",
        priority: "MEDIUM",
        requester_id: user.id,
        company_id: user.company_id,
        asset_id: null,
        group_id: null,
        category_id: null,
      }
    });
    console.log("Success:", ticket);
  } catch (e) {
    console.error("Error creating ticket:", e);
  }
}
test();
