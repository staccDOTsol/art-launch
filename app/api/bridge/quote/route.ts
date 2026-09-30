import { NextResponse } from "next/server";

const RPC = "https://rpc.squarefun.xyz";
const VAULT = "7ZPmg22B2BZh6SEVN21rNmymrBZrspPdoggNRfjkrdXE"; // replace with vault PDA after init

export async function GET() {
  try {
    // fetch vault state: R (locked) and S (supply)
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [VAULT, { encoding: "base64" }],
      }),
    });
    const { result } = await res.json();
    if (!result?.value) {
      return NextResponse.json({ rate: 0, r: 0, s: 0, note: "vault not initialized yet" });
    }
    // TODO: decode BridgeVault from base64 data — R at offset 8+96, S at 8+104
    return NextResponse.json({ rate: 1, r: 0, s: 0, note: "decode pending vault init" });
  } catch {
    return NextResponse.json({ rate: 0, r: 0, s: 0, error: "rpc unreachable" });
  }
}
