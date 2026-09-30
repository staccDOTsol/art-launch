import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

export const BRIDGE_ID = new PublicKey(
  "7ZPmg22B2BZh6SEVN21rNmymrBZrspPdoggNRfjkrdXE"
);

const ART_RPC = "https://rpc.squarefun.xyz";
export const MAINNET_ART = new PublicKey(
  "6XNdGz7yPugz4ZcWyBssFMkBZ91KmyDeqtjapUJ2pump"
);

// Vault PDA: seeds = ["vault"]
export function vaultPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    BRIDGE_ID
  );
  return pda;
}

// Vault data layout (after 8-byte anchor discriminator):
// 32 mainnet_mint, 32 mirror_mint, 32 authority, 8 r, 8 s, 8 virtual_r, 8 virtual_s, 1 bump
export interface VaultState {
  mainnetMint: PublicKey;
  mirrorMint: PublicKey;
  authority: PublicKey;
  r: bigint;
  s: bigint;
  virtualR: bigint;
  virtualS: bigint;
  rate: number; // R/S
}

export function decodeVault(data: Buffer): VaultState | null {
  if (data.length < 137) return null;
  let off = 8; // anchor discriminator
  const mainnetMint = new PublicKey(data.slice(off, (off += 32)));
  const mirrorMint = new PublicKey(data.slice(off, (off += 32)));
  const authority = new PublicKey(data.slice(off, (off += 32)));
  const r = data.readBigUInt64LE(off);
  const s = data.readBigUInt64LE(off + 8);
  const virtualR = data.readBigUInt64LE(off + 16);
  const virtualS = data.readBigUInt64LE(off + 24);
  const totalR = r + virtualR;
  const totalS = s + virtualS;
  const rate = totalS > 0n ? Number(totalR) / Number(totalS) : 0;
  return { mainnetMint, mirrorMint, authority, r, s, virtualR, virtualS, rate };
}

export async function fetchVaultState(): Promise<VaultState | null> {
  const conn = new Connection(ART_RPC);
  const info = await conn.getAccountInfo(vaultPDA());
  if (!info || !info.data) return null;
  return decodeVault(Buffer.from(info.data));
}

// Build deposit instruction (simplified — replace with Anchor-generated IDL call)
export async function buildDepositTx(
  user: PublicKey,
  amount: bigint
): Promise<Transaction | null> {
  const conn = new Connection(ART_RPC);
  const vault = vaultPDA();
  const state = await fetchVaultState();
  if (!state) return null;

  const { recentBlockhash } = await conn.getLatestBlockhash();

  // TODO: replace with Anchor program.methods.deposit(amount) once
  // the program is deployed and IDL is generated. This is the shape.
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: user,
      toPubkey: vault,
      lamports: amount,
    })
  );
  tx.recentBlockhash = recentBlockhash;
  tx.feePayer = user;
  return tx;
}

export async function buildRedeemTx(
  user: PublicKey,
  shares: bigint
): Promise<Transaction | null> {
  const conn = new Connection(ART_RPC);
  const vault = vaultPDA();
  const state = await fetchVaultState();
  if (!state) return null;

  const { recentBlockhash } = await conn.getLatestBlockhash();

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: user,
      toPubkey: vault,
      lamports: shares,
    })
  );
  tx.recentBlockhash = recentBlockhash;
  tx.feePayer = user;
  return tx;
}
