import { NextResponse } from "next/server";

/**
 * Resolve the FastAPI backend base URL the same way /api/data and
 * /api/uummannaq do — try every configured variable so the chat proxy never
 * fails just because a different one is set in production.
 */
function normalizeBackendBaseUrl(rawUrl: string) {
  const url = rawUrl.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.includes(".railway.internal")) return `http://${url}`;
  return `https://${url}`;
}

function getBackendBaseUrls() {
  return [
    ...new Set(
      [
        process.env.BACKEND_INTERNAL_URL,
        process.env.RAILWAY_SERVICE_FASTAPI_BACKEND_URL,
        process.env.BACKEND_PUBLIC_URL,
      ]
        .filter((value): value is string => Boolean(value))
        .map(normalizeBackendBaseUrl),
    ),
  ];
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const backendUrls = getBackendBaseUrls();
  if (backendUrls.length === 0) {
    return NextResponse.json(
      {
        error:
          "No backend URL set (BACKEND_INTERNAL_URL / RAILWAY_SERVICE_FASTAPI_BACKEND_URL / BACKEND_PUBLIC_URL)",
      },
      { status: 500 },
    );
  }

  let lastError: unknown;
  for (const backendUrl of backendUrls) {
    const target = `${backendUrl.replace(/\/+$/, "")}/chat_stream`;
    try {
      const res = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: errText }, { status: res.status });
      }

      // Pipe the SSE stream straight through, token by token (do NOT buffer
      // with res.text() — that would defeat the typing animation).
      return new NextResponse(res.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      lastError = error;
      // try the next backend URL, if any
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "No backend URL could be reached";
  console.error("chat_stream proxy error:", lastError);
  return NextResponse.json({ error: message }, { status: 500 });
}
