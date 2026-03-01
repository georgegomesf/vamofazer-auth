import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VamoFazer",
  description: "Serviço centralizado de autenticação",
};

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
