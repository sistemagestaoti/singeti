const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('041219', 10);
  await prisma.user.update({
    where: { email: 'admin@sisgeti.com.br' },
    data: { password_hash: hash }
  });
  console.log("Senha atualizada com sucesso.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
