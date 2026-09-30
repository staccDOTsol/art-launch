"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Oval } from "react-loader-spinner";

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
            onClick={deposit}
            disabled={busy}
          >
            {busy ? <Oval color="white" height={20} width={20} /> : "lock →"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/board")}
          >
            ← board
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
