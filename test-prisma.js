const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projectId = "twncajdp50007xvlfk3oig9ru";
  const project = await prisma.project.findFirst({ where: { id: projectId } });
  console.log("Project Found:", project);
}

main().catch(console.error).finally(() => prisma.$disconnect());
