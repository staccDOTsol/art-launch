import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SolanaWalletProvider } from "../providers/WalletProvider";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "STACC model",
  description: "Trade the model token on Solana mainnet and chat on the separate model chain.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <SolanaWalletProvider>
        <body className={`${inter.className} bg-primary`}>
          {children} <Analytics />
        </body>
      </SolanaWalletProvider>
    </html>
  );
}
