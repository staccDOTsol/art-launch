import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getTokenMetadata, unpackMint } from "@solana/spl-token";
import { MODEL_MINT_ADDRESS } from "@/lib/model-config";

export const dynamic = "force-dynamic";

async function verifyModelMint(genesis: string): Promise<void> {
  const expectedName = process.env.MODEL_CHAIN_MINT_NAME?.trim();
  const expectedUri = process.env.MODEL_CHAIN_METADATA_URI?.trim();
  if (!expectedName || !expectedUri) throw new Error("The model mint metadata expectations are not configured.");

  const rpc = new URL(process.env.MODEL_CHAIN_RPC_URL || "https://rpc-model.staccpad.fun");
  if (rpc.protocol !== "https:" || rpc.username || rpc.password) {
    throw new Error("The model-chain RPC must use public HTTPS.");
  }
  const connection = new Connection(rpc.toString(), "confirmed");
  const mint = new PublicKey(MODEL_MINT_ADDRESS);
  const check = async () => {
    if (await connection.getGenesisHash() !== genesis) throw new Error("Model-chain genesis did not match.");
    const account = await connection.getAccountInfo(mint, "confirmed");
    if (!account || !account.owner.equals(TOKEN_2022_PROGRAM_ID)) throw new Error("Model-chain mint is absent.");
    unpackMint(mint, account, TOKEN_2022_PROGRAM_ID);
    const metadata = await getTokenMetadata(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    if (!metadata || metadata.name.trim() !== expectedName || metadata.uri.trim() !== expectedUri) {
      throw new Error("Model-chain mint metadata did not match.");
    }
  };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      check(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Model-chain RPC timed out.")), 7_000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function GET() {
  const url = process.env.MODEL_CHAT_ORIGIN?.replace(/\/$/, "");
  const genesis = process.env.MODEL_CHAT_GENESIS_HASH;
  if (!url || !genesis) {
    return NextResponse.json({ ready: false, reason: "The new chain and chat service are being prepared." });
  }

  try {
    const origin = new URL(url);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/") {
      throw new Error("The chat service URL is not a public HTTPS origin.");
    }
    const response = await fetch(`${origin.origin}/api/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(7_000),
    });
    if (!response.ok) throw new Error("The chat service did not respond successfully.");
    const status = await response.json() as { ready?: boolean; genesis?: string; cluster?: string };
    if (!status.ready || status.genesis !== genesis || status.cluster === "testnet" || status.cluster === "mainnet-beta") {
      throw new Error("The chat service has not verified the new chain and model deployment.");
    }
    await verifyModelMint(genesis);
    return NextResponse.json({ ready: true, url: origin.origin });
  } catch {
    return NextResponse.json({ ready: false, reason: "The model-chain chat deployment is not verified yet." });
  }
}
