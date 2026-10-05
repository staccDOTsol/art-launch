import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { Connection, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// derive the token program from the mint account itself — works for both
// legacy SPL and Token-2022 mints
export async function getMintTokenProgram(
  connection: Connection,
  mint: string | PublicKey
): Promise<PublicKey> {
  try {
    const info = await connection
      .getAccountInfo(new PublicKey(mint))
      .catch(() => null);
    if (info?.owner) return info.owner;
  } catch {}
  return TOKEN_PROGRAM_ID;
}

export { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID };

export const PUMP_FEES_PROGRAM_ID = new PublicKey(
  "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ"
);

// pump buyback vault + current buyback fee recipient (required remaining accounts)
export const BUYBACK_VAULT = new PublicKey(
  "7xYAvMQbZALbPiFHwV9YZu96aq2LrzqQmMHx6id4mybh"
);
export const buybackRemainingAccounts = (global: any) => [
  { pubkey: BUYBACK_VAULT, isWritable: true, isSigner: false },
  {
    pubkey: (global?.buybackFeeRecipients || [BUYBACK_VAULT])[0],
    isWritable: true,
    isSigner: false,
  },
];
