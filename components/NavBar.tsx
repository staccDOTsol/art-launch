"use client";

import Image from "next/image";
import Link from "next/link";

// Keep the launchpad's visual shell while the older fork-chain routes are gated.
export default function NavBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-primary">
      <nav className="flex flex-wrap items-center gap-3 border-b border-[#3d4050] p-3">
        <Link href="/model" className="flex items-center gap-2 text-white">
          <Image src="/logo.png" alt="art" width={30} height={30} />
          <span className="text-sm font-semibold">STACC MODEL</span>
        </Link>
        <Link href="/model" className="rounded border border-lime-300 px-3 py-2 text-xs font-semibold text-lime-300 hover:bg-lime-300 hover:text-[#15171b]">
          TRADE + CHAT
        </Link>
        <div className="ml-auto flex gap-3 text-xs text-gray-400">
          <a href="https://x.com/STACCoverflow" target="_blank" rel="noopener noreferrer" className="hover:text-white">X</a>
          <a href="https://deck.squarefun.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-white">Community</a>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
