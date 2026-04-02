import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prismaClientSingleton = () => {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 2, // Limite de 2 conexões por instância serverless
    idleTimeoutMillis: 1000, // Encerra conexões ociosas em 1 segundo
    connectionTimeoutMillis: 15000, // Espera até 15s antes de dar timeout de conexão
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
