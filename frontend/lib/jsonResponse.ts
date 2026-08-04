/**
 * JSON responses for the API proxies, compressed.
 *
 * Next compresses the rendering pipeline but not Route Handlers, so
 * `NextResponse.json()` puts the payload on the wire uncompressed. Measured on
 * the production build: /api/data went out at 883 KB and /api/uummannaq at
 * 242 KB, which on a 4 Mbit/s mobile connection is fifteen seconds of the
 * reader's life. The same JSON gzips 8.1x and 7.3x, because it is mostly
 * repeated keys and short numbers.
 *
 * Doing it here rather than relying on the host means the story behaves the
 * same whether it is served from Railway, a plain Node process or anything
 * else. Platforms that compress at the edge see `content-encoding` already set
 * and leave the body alone.
 *
 * gzip rather than brotli: `CompressionStream` has no brotli, and brotli would
 * buy roughly another 40 percent on top of a reduction that is already the
 * difference between fifteen seconds and two.
 */

const encoder = new TextEncoder();

const clientAcceptsGzip = (request: Request): boolean => {
  const accepted = request.headers.get("accept-encoding");
  if (!accepted) return false;
  // "gzip;q=0" is a client explicitly refusing it
  return accepted
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .some((part) => part === "gzip" || part.startsWith("gzip;q=0."));
};

export function jsonResponse(
  request: Request,
  data: unknown,
  init: { status?: number; headers?: Headers } = {}
): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.append("vary", "accept-encoding");

  const body = encoder.encode(JSON.stringify(data));

  if (!clientAcceptsGzip(request) || typeof CompressionStream === "undefined") {
    return new Response(body, { status: init.status ?? 200, headers });
  }

  headers.set("content-encoding", "gzip");

  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(body);
      controller.close();
    },
  });

  return new Response(source.pipeThrough(new CompressionStream("gzip")), {
    status: init.status ?? 200,
    headers,
  });
}
