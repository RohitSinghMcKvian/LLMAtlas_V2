import { NextResponse } from "next/server";
import { checkAll } from "@/lib/api-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const results = await checkAll();
  return NextResponse.json({
    ts: Date.now(),
    providers: results,
  });
}
