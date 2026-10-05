import { NextRequest, NextResponse } from "next/server";

// This isolated model site does not publish the checkout's older fork-chain
// launch and trade routes while their RPC and programs are unverified.
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/model" || path === "/api/model-chat-status" ||
      path === "/api/model-mainnet-rpc" || path.startsWith("/_next/") ||
      path === "/sea-chat-token.jpg" || path === "/logo.png" ||
      path === "/favicon.ico" || path === "/icon.png") {
    return NextResponse.next();
  }
  if (path.startsWith("/api/") || request.method !== "GET") {
    return new Response("Not found", { status: 404 });
  }
  return NextResponse.redirect(new URL("/model", request.url));
}

export const config = { matcher: "/:path*" };
