"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { useEffect, useMemo } from "react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  MathWalletAdapter,
  WalletConnectWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  TokenPocketWalletAdapter,
  CoinbaseWalletAdapter,
  SolongWalletAdapter,
  Coin98WalletAdapter,
  SafePalWalletAdapter,
  BitpieWalletAdapter,
  BitgetWalletAdapter,
  CloverWalletAdapter,
  CoinhubWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  WalletAdapterNetwork,
  isIosAndRedirectable,
} from "@solana/wallet-adapter-base";
import { useIsClient } from "@uidotdev/usehooks";
import { isMobile } from "react-device-detect";

export const SolanaWalletProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isClient = useIsClient();
  // This isolated deployment exposes only the model page and Solana mainnet.
  const endpoint = typeof window === "undefined"
    ? "https://api.mainnet-beta.solana.com"
    : `${window.location.origin}/api/model-mainnet-rpc`;

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new MathWalletAdapter({ endpoint }),
      new TokenPocketWalletAdapter(),
      new CoinbaseWalletAdapter({ endpoint }),
      new SolongWalletAdapter({ endpoint }),
      new Coin98WalletAdapter({ endpoint }),
      new SafePalWalletAdapter({ endpoint }),
      new BitpieWalletAdapter({ endpoint }),
      new BitgetWalletAdapter({ endpoint }),
      new CloverWalletAdapter(),
      new CoinhubWalletAdapter(),
      new WalletConnectWalletAdapter({
        network: WalletAdapterNetwork.Mainnet, // const only, cannot use condition to use dev/main, guess is relative to walletconnect connection init
        options: {
          // projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PJ_ID,
          metadata: {
            name: "STACCPAD CHAT",
            description: "Trade the model token on Solana mainnet and chat on the model chain.",
            url: "https://model.squarefun.xyz",
            icons: ["https://model.squarefun.xyz/sea-chat-token.jpg"],
          },
        },
      }),
    ],
    [endpoint]
  );

  useEffect(() => {
    if (isIosAndRedirectable() && isMobile) {
      const interval = setInterval(() => {
        localStorage.removeItem("walletName");
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isClient]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider key={endpoint} wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};
