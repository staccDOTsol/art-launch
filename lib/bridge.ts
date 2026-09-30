import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createBurnInstruction,
  createTransferInstruction,
} from "@solana/spl-token";

export const BRIDGE_ID = new PublicKey(
  "7ZPmg22B2BZh6SEVN21rNmymrBZrspPdoggNRfjkrdXE"
);
const ART_RPC = "https://rpc.squarefun.xyz";
export const MAINNET_ART_MINT = new PublicKey(
  "6XNdGz7yPugz4ZcWyBssFMkBZ91KmyDeqtjapUJ2pump"
);

export function vaultPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    BRIDGE_ID
  );
  return pda;
}

// ============ VAULT STATE ============

export interface VaultState {
  mainnetMint: PublicKey;
  mirrorMint: PublicKey;
  authority: PublicKey;
  r: bigint;
  s: bigint;
  virtualR: bigint;
  virtualS: bigint;
  rate: number;
}

export function decodeVault(data: Buffer): VaultState | null {
  if (data.length < 137) return null;
  let off = 8;
  const mainnetMint = new PublicKey(data.subarray(off, (off += 32)));
  const mirrorMint = new PublicKey(data.subarray(off, (off += 32)));
  const authority = new PublicKey(data.subarray(off, (off += 32)));
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
  if (!info?.data) return null;
  return decodeVault(Buffer.from(info.data));
}

// ============ INSTRUCTION BUILDERS ============
// Anchor discriminators: sha256("global:<method>")[0..8]

function anchorDiscriminator(method: string): Buffer {
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(`global:${method}`).digest();
  return hash.subarray(0, 8);
}

export interface BridgeAccounts {
  vault: PublicKey;
  mirrorMint: PublicKey;
  vaultMainnetAta: PublicKey;
  userMainnetAta: PublicKey;
  userMirrorAta: PublicKey;
  user: PublicKey;
  tokenProgram: PublicKey;
  systemProgram: PublicKey;
  rent: PublicKey;
}

export async function getBridgeAccounts(
  user: PublicKey,
  vaultState: VaultState
): Promise<BridgeAccounts> {
  const vault = vaultPDA();
  const vaultMainnetAta = await getAssociatedTokenAddress(
    vaultState.mainnetMint,
    vault,
    true
  );
  const userMainnetAta = await getAssociatedTokenAddress(
    vaultState.mainnetMint,
    user
  );
  const userMirrorAta = await getAssociatedTokenAddress(
    vaultState.mirrorMint,
    user
  );
  return {
    vault,
    mirrorMint: vaultState.mirrorMint,
    vaultMainnetAta,
    userMainnetAta,
    userMirrorAta,
    user,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  };
}

// ============ INITIALIZE ============

export async function buildInitializeTx(
  authority: PublicKey,
  mainnetMint: PublicKey,
  mirrorMint: PublicKey
): Promise<Transaction> {
  const conn = new Connection(ART_RPC);
  const { recentBlockhash } = await conn.getLatestBlockhash();
  const vault = vaultPDA();

  const ix = new TransactionInstruction({
    programId: BRIDGE_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: mainnetMint, isSigner: false, isWritable: false },
      { pubkey: mirrorMint, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      anchorDiscriminator("initialize"),
    ]),
  });

  const tx = new Transaction().add(ix);
  tx.recentBlockhash = recentBlockhash;
  tx.feePayer = authority;
  return tx;
}

// ============ DEPOSIT ============

export async function buildDepositTx(
  user: PublicKey,
  amount: bigint
): Promise<Transaction | null> {
  const conn = new Connection(ART_RPC);
  const state = await fetchVaultState();
  if (!state) return null;
  const accts = await getBridgeAccounts(user, state);
  const { recentBlockhash } = await conn.getLatestBlockhash();

  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amount);

  const ixs: TransactionInstruction[] = [];

  // ensure user has mirror ATA
  const mirrorAtaInfo = await conn.getAccountInfo(accts.userMirrorAta);
  if (!mirrorAtaInfo) {
    ixs.push(
      createAssociatedTokenAccountInstruction(
        user,
        accts.userMirrorAta,
        user,
        state.mirrorMint
      )
    );
  }

  // deposit instruction
  ixs.push(
    new TransactionInstruction({
      programId: BRIDGE_ID,
      keys: [
        { pubkey: accts.vault, isSigner: false, isWritable: true },
        { pubkey: accts.mirrorMint, isSigner: false, isWritable: true },
        { pubkey: accts.vaultMainnetAta, isSigner: false, isWritable: true },
        { pubkey: accts.userMainnetAta, isSigner: false, isWritable: true },
        { pubkey: accts.userMirrorAta, isSigner: false, isWritable: true },
        { pubkey: accts.user, isSigner: true, isWritable: true },
        { pubkey: accts.tokenProgram, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        anchorDiscriminator("deposit"),
        amountBuf,
      ]),
    })
  );

  const tx = new Transaction().add(...ixs);
  tx.recentBlockhash = recentBlockhash;
  tx.feePayer = user;
  return tx;
}

// ============ REDEEM ============

export async function buildRedeemTx(
  user: PublicKey,
  shares: bigint
): Promise<Transaction | null> {
  const conn = new Connection(ART_RPC);
  const state = await fetchVaultState();
  if (!state) return null;
  const accts = await getBridgeAccounts(user, state);
  const { recentBlockhash } = await conn.getLatestBlockhash();

  const sharesBuf = Buffer.alloc(8);
  sharesBuf.writeBigUInt64LE(shares);

  const tx = new Transaction().add(
    new TransactionInstruction({
      programId: BRIDGE_ID,
      keys: [
        { pubkey: accts.vault, isSigner: false, isWritable: true },
        { pubkey: accts.mirrorMint, isSigner: false, isWritable: true },
        { pubkey: accts.vaultMainnetAta, isSigner: false, isWritable: true },
        { pubkey: accts.userMainnetAta, isSigner: false, isWritable: true },
        { pubkey: accts.userMirrorAta, isSigner: false, isWritable: true },
        { pubkey: accts.user, isSigner: true, isWritable: true },
        { pubkey: accts.tokenProgram, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        anchorDiscriminator("redeem"),
        sharesBuf,
      ]),
    })
  );
  tx.recentBlockhash = recentBlockhash;
  tx.feePayer = user;
  return tx;
}

// ============ REPORT_BURN (attested) ============

export async function buildReportBurnTx(
  reporter: PublicKey,
  burnedShares: bigint
): Promise<Transaction | null> {
  const conn = new Connection(ART_RPC);
  const { recentBlockhash } = await conn.getLatestBlockhash();
  const vault = vaultPDA();

  const burnBuf = Buffer.alloc(8);
  burnBuf.writeBigUInt64LE(burnedShares);

  const tx = new Transaction().add(
    new TransactionInstruction({
      programId: BRIDGE_ID,
      keys: [
        { pubkey: vault, isSigner: false, isWritable: true },
        { pubkey: reporter, isSigner: true, isWritable: false },
      ],
      data: Buffer.concat([
        anchorDiscriminator("report_burn"),
        burnBuf,
      ]),
    })
  );
  tx.recentBlockhash = recentBlockhash;
  tx.feePayer = reporter;
  return tx;
}

// ============ QUOTE ============

export interface BridgeQuote {
  rate: number;
  r: string;
  s: string;
  feeBps: number;
  depositQuote?: (amountIn: number) => number;
  redeemQuote?: (sharesIn: number) => number;
}

export async function getQuote(): Promise<BridgeQuote | null> {
  const state = await fetchVaultState();
  if (!state) return null;
  return {
    rate: state.rate,
    r: state.r.toString(),
    s: state.s.toString(),
    feeBps: 100, // 1%
    depositQuote: (amountIn: number) => {
      const gross = (BigInt(Math.floor(amountIn * 1e6)) * (state.s + state.virtualS)) /
        (state.r + state.virtualR);
      const fee = gross / 100n;
      return Number(gross - fee) / 1e6;
    },
    redeemQuote: (sharesIn: number) => {
      const gross = (BigInt(Math.floor(sharesIn * 1e6)) * (state.r + state.virtualR)) /
        (state.s + state.virtualS);
      const fee = gross / 100n;
      return Number(gross - fee) / 1e6;
    },
  };
}
