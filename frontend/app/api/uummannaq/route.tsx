import { NextResponse } from "next/server";
import type { FjordDataBundle } from "@/types";

export const dynamic = "force-dynamic"; // no static cache
export const revalidate = 0;

export async function GET(_request: Request) {
  try {
    const backendUrl = process.env.BACKEND_INTERNAL_URL;
    if (!backendUrl) {
      console.error("BACKEND_INTERNAL_URL is not set");
      return NextResponse.json(
        { error: "BACKEND_INTERNAL_URL is not set" },
        { status: 500 }
      );
    }

    // normalize slashes and build target URL
    const base = backendUrl.replace(/\/+$/, "");
    const targetUrl = `${base}/uummannaq`;
    console.log("Fetching fjord data from:", targetUrl);

    // (optional) time-out for safety
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Backend fjord error:", response.status, text);
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${text}` },
        { status: response.status }
      );
    }

    const data = (await response.json()) as FjordDataBundle & {
      seasonLossPct?: number | null;
    };
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg =
      error instanceof Error && error.name === "AbortError"
        ? "Upstream timeout"
        : error instanceof Error
        ? error.message
        : "Internal Server Error";
    console.error("Error in /api/uummannaq proxy:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
