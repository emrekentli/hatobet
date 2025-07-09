import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import Navbar from "@/components/Navbar";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HatoBet",
  description: "Haftalık maç tahminleri ile puan kazanın!",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="tr">
      <body className={inter.className}>
        <SessionProvider session={session}>
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
