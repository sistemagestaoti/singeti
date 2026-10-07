import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()
  console.log("Users:", users.length)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
