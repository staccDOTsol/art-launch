"use client";

import { useState } from "react";
import { ModelChat } from "./model-chat";
import { ModelMarket } from "./model-market";
import { ModelTrade } from "./model-trade";

export function ModelWorkspace() {
  const [mode, setMode] = useState<"trade" | "chat">("trade");

  return (
    <div>
      <div className="sticky top-0 z-20 mb-5 grid grid-cols-2 gap-2 rounded-xl border border-[#3d4050] bg-[#202229] p-1.5 lg:static" role="tablist" aria-label="Model action">
        <button type="button" role="tab" aria-selected={mode === "trade"} onClick={() => setMode("trade")}
          className={`rounded-lg px-4 py-3 text-left transition-colors ${mode === "trade" ? "bg-lime-300 text-[#15171b]" : "text-gray-300 hover:bg-[#2c3038]"}`}>
          <span className="block text-sm font-semibold">Trade</span>
          <span className="block text-[11px]">Solana mainnet</span>
        </button>
        <button type="button" role="tab" aria-selected={mode === "chat"} onClick={() => setMode("chat")}
          className={`rounded-lg px-4 py-3 text-left transition-colors ${mode === "chat" ? "bg-lime-300 text-[#15171b]" : "text-gray-300 hover:bg-[#2c3038]"}`}>
          <span className="block text-sm font-semibold">Chat</span>
          <span className="block text-[11px]">Model chain</span>
        </button>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="order-2 lg:order-1"><ModelMarket /></div>
        <div className="order-1 lg:order-2">{mode === "trade" ? <ModelTrade /> : <ModelChat />}</div>
      </div>
    </div>
  );
}
