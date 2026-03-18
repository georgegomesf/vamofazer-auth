import type { Metadata } from "next";
import "./globals.css";

import prisma from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const defaultProjectId = process.env.NEXT_PUBLIC_PROJECT_ID;
  let title = "Autenticação";

  if (defaultProjectId) {
    const project = await prisma.project.findUnique({ where: { id: defaultProjectId } });
    if (project) title = project.name;
  }

  return {
    title,
    description: "Serviço centralizado de autenticação",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
