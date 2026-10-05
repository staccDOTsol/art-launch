"use client";

import { useEffect, useState } from "react";

type ChatStatus = { ready: boolean; reason?: string; url?: string };

export function ModelChat() {
  const [status, setStatus] = useState<ChatStatus>({ ready: false, reason: "Checking the model chain…" });

  useEffect(() => {
    let live = true;
    const check = async () => {
      try {
        const response = await fetch("/api/model-chat-status", { cache: "no-store" });
        const next = (await response.json()) as ChatStatus;
        if (live) setStatus(next);
      } catch {
        if (live) setStatus({ ready: false, reason: "The model-chain chat service is unavailable." });
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 30_000);
    return () => { live = false; window.clearInterval(timer); };
  }, []);

  return (
    <section className="overflow-hidden rounded-xl border border-[#3d4050] bg-[#202229]">
      <div className="border-b border-[#3d4050] px-5 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-lime-300">Custom-chain inference</p>
        <h2 className="mt-1 text-xl font-semibold">On-chain chat</h2>
        <p className="mt-1 text-xs text-gray-400">The model chain uses the matching mint address, with separate chain state.</p>
      </div>
      {status.ready && status.url ? (
        <div>
          <iframe
            src={status.url}
            title="Model-chain chat"
            className="h-[680px] w-full bg-[#15171b]"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <div className="border-t border-[#3d4050] px-5 py-3 text-xs text-gray-400">
            Chat sessions are served by the model chain.
            {" "}<a href={status.url} target="_blank" rel="noopener noreferrer" className="text-lime-300 underline">Open chat in a new tab</a>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 h-3 w-3 rounded-full bg-amber-400" />
          <p className="text-lg font-medium">Chat is not live on the new chain yet.</p>
          <p className="mt-2 max-w-sm text-sm text-gray-400">{status.reason ?? "Waiting for the verified model-chain deployment."}</p>
        </div>
      )}
    </section>
  );
}
