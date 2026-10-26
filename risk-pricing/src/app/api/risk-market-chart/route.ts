export const revalidate = 300;

import { NextResponse } from "next/server";
import { gnosis } from "viem/chains";

import { RISK_PRICING_MARKET_ID } from "@/consts/markets";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET() {
  const upstream = await fetch(
    `https://app.seer.pm/.netlify/functions/market-chart?marketId=${RISK_PRICING_MARKET_ID}&chainId=${gnosis.id}`,
    { next: { revalidate: 300 } },
  );
  const data = await upstream.json();
  const res = NextResponse.json({ data });
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}
