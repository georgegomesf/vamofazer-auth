const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const token = await prisma.verificationToken.findFirst({
    orderBy: { expires: 'desc' }
  });
  console.log(token);
}
test().finally(() => prisma.$disconnect());
