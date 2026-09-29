import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SolanaWalletProvider } from "../providers/WalletProvider";
import { LinkedXProvider } from "@/providers/LinkedXProvider";
import { Analytics } from "@vercel/analytics/react";
import { SocketProvider } from "@/providers/SocketProvider";
import { IpfsPrefixProvider } from "@/providers/IpfsPrefixProvider";
import { PriorityFeeProvider } from "@/providers/PriorityFeeProvider";
import { RpcUrlProvider } from "@/providers/RpcUrlProvider";
import { ProfileProvider } from "@/providers/ProfileProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "art — launch on art",
  description: "solana on art — every wallet, every token, already there. the k-th write pays k².",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <SocketProvider>
        <RpcUrlProvider>
          <SolanaWalletProvider>
            <ProfileProvider>
              <PriorityFeeProvider>
                  <IpfsPrefixProvider>
                    <body className={`${inter.className} bg-primary`}>
                      {children} <Analytics />
                    </body>
                  </IpfsPrefixProvider>
              </PriorityFeeProvider>
            </ProfileProvider>
          </SolanaWalletProvider>
        </RpcUrlProvider>
      </SocketProvider>
    </html>
  );
}
