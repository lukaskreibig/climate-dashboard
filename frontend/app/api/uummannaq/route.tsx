import { NextResponse } from "next/server";
import type { FjordDataBundle } from "@/types";

export const dynamic = "force-dynamic"; // no static cache
export const revalidate = 0;

function getBackendBaseUrls() {
  const urls = [
    process.env.BACKEND_INTERNAL_URL,
    process.env.RAILWAY_SERVICE_FASTAPI_BACKEND_URL,
    process.env.BACKEND_PUBLIC_URL,
  ].filter((value): value is string => Boolean(value));
  return [...new Set(urls)];
}

function forwardClimateHeaders(from: Headers, to: Headers) {
  for (const name of [
    "x-climate-route",
    "x-climate-data-source",
    "x-climate-db-status",
    "x-climate-db-host",
  ]) {
    const value = from.get(name);
    if (value) to.set(name, value);
  }
}

export async function GET(_request: Request) {
  try {
    const backendUrls = getBackendBaseUrls();
    if (backendUrls.length === 0) {
      console.error(
        "BACKEND_INTERNAL_URL / RAILWAY_SERVICE_FASTAPI_BACKEND_URL / BACKEND_PUBLIC_URL is not set",
      );
      return NextResponse.json(
        {
          error:
            "BACKEND_INTERNAL_URL, RAILWAY_SERVICE_FASTAPI_BACKEND_URL or BACKEND_PUBLIC_URL is not set",
        },
        { status: 500 }
      );
    }

    let lastError: unknown;
    for (const backendUrl of backendUrls) {
      const base = backendUrl.replace(/\/+$/, "");
      const targetUrl = `${base}/uummannaq`;
      console.log("Fetching fjord data from:", targetUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
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
        const out = NextResponse.json(data);
        forwardClimateHeaders(response.headers, out.headers);
        try {
          out.headers.set("x-climate-backend-host", new URL(base).host);
        } catch {
          // Ignore malformed URL in debug header, response body has already succeeded.
        }
        return out;
      } catch (error) {
        lastError = error;
        if (backendUrl !== backendUrls[backendUrls.length - 1]) {
          console.warn("Fjord backend fetch failed, trying fallback backend:", error);
          continue;
        }
      }
    }

    throw lastError ?? new Error("No backend URL could be reached");
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
