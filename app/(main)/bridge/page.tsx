"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Oval } from "react-loader-spinner";
import { buildDepositTx, buildRedeemTx, getQuote, vaultPDA } from "@/lib/bridge";

const BRIDGE_ID = "7ZPmg22B2BZh6SEVN21rNmymrBZrspPdoggNRfjkrdXE";
const MAINNET_ART = "6XNdGz7yPugz4ZcWyBssFMkBZ91KmyDeqtjapUJ2pump";

export default function BridgePage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { visible, setVisible } = useWalletModal();
  const router = useRouter();
  const [amount, setAmount] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [mode, setMode] = useState<"deposit" | "redeem">("deposit");

  const submit = useCallback(async () => {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setMsg("enter an amount");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const q = await getQuote();
      if (!q) {
        setMsg("vault not initialized yet");
        return;
      }
      const isDeposit = mode === "deposit";
      const result = isDeposit
        ? q.depositQuote?.(amt) ?? 0
        : q.redeemQuote?.(amt) ?? 0;
      setMsg(
        isDeposit
          ? `locking ${amt} mainnet $ART → minting ~${result} art-side $ART (1% fee in vault)`
          : `burning ${amt} art-side $ART → releasing ~${result} mainnet $ART (1% fee in vault)`
      );
      // TODO: build + sign + send the actual tx via signTransaction once vault is live
      // const tx = isDeposit
      //   ? await buildDepositTx(publicKey, BigInt(Math.floor(amt * 1e6)))
      //   : await buildRedeemTx(publicKey, BigInt(Math.floor(amt * 1e6)));
      // const signed = await signTransaction(tx);
      // const sig = await connection.sendRawTransaction(signed.serialize());
      // setMsg(`sent: ${sig}`);
    } catch {
      setMsg("bridge unreachable — is the chain up?");
    } finally {
      setBusy(false);
    }
  }, [publicKey, signTransaction, connection, amount, mode, setVisible]);

  const deposit = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      setVisible(true);
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setMsg("enter an amount");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      // fetch quote from our API (rate = R/S)
      const res = await fetch("/api/bridge/quote");
      const { rate } = await res.json();
      const out = (amt * rate * 0.99).toFixed(2); // 1% fee
      setMsg(`locking ${amt} mainnet $ART → minting ~${out} art-side $ART. transaction flow: sign in wallet.`);
      // TODO: build + send the deposit tx via wallet adapter once vault is initialized on art
    } catch (e) {
      setMsg("bridge quote failed — is the chain up?");
    } finally {
      setBusy(false);
    }
  }, [publicKey, signTransaction, amount, setVisible]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
      <h1 className="text-3xl font-bold">$ART bridge</h1>
      <p className="text-sm text-slate-400 max-w-md text-center">
        the only thing that crosses. lock mainnet $ART → mint art-side at R/S.
        redeem any time. every crossing leaves 1% in the vault — the rate only
        goes up.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="amount"
            className="flex-1 bg-transparent border border-white rounded px-4 py-3 text-white"
          />
          <Button
            className="bg-gray-300 text-primary hover:text-slate-50"
            onClick={submit}
            disabled={busy}
          >
            {busy ? <Oval color="white" height={20} width={20} /> : mode === "deposit" ? "lock →" : "← redeem"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mode === "deposit" ? "default" : "outline"}
            className="flex-1 text-xs"
            onClick={() => setMode("deposit")}
          >
            deposit
          </Button>
          <Button
            variant={mode === "redeem" ? "default" : "outline"}
            className="flex-1 text-xs"
            onClick={() => setMode("redeem")}
          >
            redeem
          </Button>
        </div>
        {msg && <div className="text-sm text-slate-300 text-center">{msg}</div>}
      </div>

      <div className="text-xs text-slate-500 max-w-sm text-center">
        R/S = mainnet locked ÷ art-side supply after burns. deposits and redeems
        are rate-neutral. burns raise it. nobody can lower it.
      </div>
    </div>
  );
}
