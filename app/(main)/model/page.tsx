import type { Metadata } from "next";
import Image from "next/image";
import { ModelWorkspace } from "./model-workspace";
import { MODEL_MINT_ADDRESS } from "@/lib/model-config";

export const metadata: Metadata = {
  title: "STACC model",
  description: "Trade the model token on Solana mainnet and use the separate on-chain chat.",
};

export default function ModelPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 text-white">
      <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row">
        <Image src="/sea-chat-token.jpg" alt="STACC model token mark" width={72} height={72} className="rounded-xl" priority />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.25em] text-lime-300">STACC model</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Trade on Solana. Chat on the model chain.</h1>
          <p className="mt-3 max-w-3xl break-words text-sm text-gray-300">
            The model mint keypair is reserved for the same public address on both chains: {MODEL_MINT_ADDRESS}.
            Token trades will use Solana mainnet; model inference will use the separate chain.
          </p>
        </div>
      </div>
      <ModelWorkspace />
    </div>
  );
}
