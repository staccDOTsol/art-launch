import { Connection, PublicKey } from "@solana/web3.js";
import { PUMP_SDK, OnlinePumpSdk, getBuyTokenAmountFromSolAmount, getSellSolAmountFromTokenAmount } from "@pump-fun/pump-sdk";
import { BRIDGE_ID, MIRROR_ART_MINT, vaultPDA, fetchVaultState } from "./bridge";

const ART_RPC = "https://rpc.squarefun.xyz";
const MN_RPC = "https://jarrett-solana-7ba9.mainnet.rpcpool.com/6dee9145-f5c7-466c-854e-edd7464c5ea8";
const MAINNET_ART = new PublicKey("6XNdGz7yPugz4ZcWyBssFMkBZ91KmyDeqtjapUJ2pump");
const PUMP_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

export interface ArbQuote {
  forkPrice: number;      // SOL per fork-$ART on art pump
  realPrice: number;      // SOL per real-$ART on mainnet pump
  ratio: number;          // bridge r/s (m$ART -> fork-$ART)
  spreadX: number;       // real/fork price ratio
  buyQuote?: (solIn: number) => number;   // fork tokens out
  arbQuote?: (solIn: number) => {
    forkBought: number;
    mArtOut: number;       // after 1% deposit fee
    realValue: number;      // mArt * ratio * 0.99 (redeem_cross fee) * realPrice
    profitSol: number;
    profitPct: number;
  };
}

async function readCurve(c: Connection, curve: PublicKey): Promise<{ vTok: bigint; vSol: bigint }> {
  const info = await c.getAccountInfo(curve);
  if (!info) throw new Error("curve not found");
  return { vTok: info.data.readBigUInt64LE(8), vSol: info.data.readBigUInt64LE(16) };
}

function curvePrice(v: { vTok: bigint; vSol: bigint }): number {
  return Number(v.vSol) / 1e9 / (Number(v.vTok) / 1e6);
}

export async function getArbQuote(): Promise<ArbQuote | null> {
  try {
    const art = new Connection(ART_RPC);
    const mn = new Connection(MN_RPC);

    const [artCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding-curve"), MAINNET_ART.toBuffer()], PUMP_PROGRAM
    );
    const [mnCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding-curve"), MAINNET_ART.toBuffer()], PUMP_PROGRAM
    );

    const [artC, mnC, vaultState] = await Promise.all([
      readCurve(art, artCurve),
      readCurve(mn, mnCurve),
      fetchVaultState(),
    ]);
    if (!vaultState) return null;

    const forkPrice = curvePrice(artC);
    let realPrice: number;
    if (mnC.vSol === 0n) {
      // graduated to pump swap — read the AMM price from dexscreener
      const ds = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/" + MAINNET_ART.toBase58()
      ).then(r => r.json()).catch(() => null);
      realPrice = ds?.pairs?.[0]?.priceNative
        ? parseFloat(ds.pairs[0].priceNative)
        : 0;
    } else {
      realPrice = curvePrice(mnC);
    }
    const ratio = vaultState.rate; // note: r/s — deposit and redeem cancel; only fees + spread matter
    const spreadX = realPrice / forkPrice;

    return {
      forkPrice,
      realPrice,
      ratio,
      spreadX,
      buyQuote: (solIn: number) => {
        // constant product: tokensOut = vTok - (vTok*vSol)/(vSol + solIn)
        const sol = solIn * 1e9;
        const vTok = Number(artC.vTok), vSol = Number(artC.vSol);
        return (vTok - (vTok * vSol) / (vSol + sol)) / 1e6;
      },
      arbQuote: (solIn: number) => {
        const forkBought = (function () {
          const sol = solIn * 1e9;
          const vTok = Number(artC.vTok), vSol = Number(artC.vSol);
          return (vTok - (vTok * vSol) / (vSol + sol)) / 1e6;
        })();
        // deposit mints at s/r, redeem releases at r/s — the ratio cancels.
        // net real $ART out = forkBought x 0.99 (deposit fee) x 0.99 (redeem fee)
        const realOut = forkBought * 0.99 * 0.99;
        const realValue = realOut * realPrice;
        const profitSol = realValue - solIn;
        return {
          forkBought,
          mArtOut: forkBought * 0.99, // display only
          realValue,
          profitSol,
          profitPct: (profitSol / solIn) * 100,
        };
      },
    };
  } catch {
    return null;
  }
}
