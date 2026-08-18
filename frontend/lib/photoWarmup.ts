import { photoSrcSet } from "@/components/StoryPhoto";

/**
 * Warm the photographs the story is about to show.
 *
 * WHY THEY ARRIVE LATE. ChartScene mounts its visual in an effect, so until
 * React has hydrated and the scene has rendered there is no photograph in the
 * document at all and the browser has nothing to fetch. By the time it learns
 * one exists, the reader is already looking at the space where it should be.
 * Measured on a 1.6 Mbit line, that was about seven seconds of empty frame.
 *
 * WHAT THIS FILE USED TO GET WRONG, written down because the mistake is the
 * useful part. It warmed through /_next/image with fetch(), and the optimiser
 * answers Vary: Accept and means it: the same URL handed a JPEG to fetch() and
 * an AVIF to an <img>. The warm pulled down a file nobody would ever request
 * and the browser fetched the real one anyway, so it was strictly worse than
 * doing nothing. The lesson survives the rewrite: a warm is only a warm if it
 * is byte for byte the request the page will make.
 *
 * WHICH IS WHY THE FORMAT IS CHOSEN HERE. The photographs are now pre-encoded
 * files picked by a <picture>, so format selection lives in the markup rather
 * than in the browser's Accept header. A detached Image() has no <source>
 * elements to choose between, so this asks the browser the same question the
 * markup asks, and warms the list it would have chosen.
 */

/**
 * A 1 px AVIF, decoded rather than sniffed.
 *
 * Decoding is the only honest test: there is no canPlayType for images, and a
 * browser that merely advertises the type can still fail on a real file.
 */
const AVIF_PROBE =
  "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAo" +
  "aGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAAB" +
  "AAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABL" +
  "aXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAAC" +
  "AAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB1tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=";

let avifSupport: Promise<boolean> | null = null;

/** Cached, because the answer cannot change within a page view. */
export function supportsAvif(): Promise<boolean> {
  if (avifSupport) return avifSupport;
  if (typeof window === "undefined") return Promise.resolve(false);
  avifSupport = new Promise<boolean>((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(probe.width === 1);
    probe.onerror = () => resolve(false);
    probe.src = AVIF_PROBE;
  });
  return avifSupport;
}

const warmed = new Set<string>();

/**
 * Warm `sources`, at most `concurrency` in flight.
 *
 * Resolves when the last one has settled. Failures are swallowed: a warm that
 * does not arrive is a photograph that loads normally later, never a broken
 * page.
 *
 * `concurrency` is a bandwidth budget now and nothing else. It was one, to keep
 * the image optimiser from being asked for two cold AVIF encodes at once on a
 * container that was being killed for it; there is no encoder in this path any
 * more, so the only question left is how much of the connection the map has to
 * share.
 */
export async function warmPhotos(
  sources: readonly string[],
  { concurrency = 2 }: { concurrency?: number } = {},
): Promise<void> {
  if (typeof window === "undefined") return;

  const format = (await supportsAvif()) ? "avif" : "webp";
  const queue = sources.filter((src) => !warmed.has(src));
  if (!queue.length) return;
  queue.forEach((src) => warmed.add(src));

  let cursor = 0;
  const pump = async (): Promise<void> => {
    while (cursor < queue.length) {
      const srcSet = photoSrcSet(queue[cursor++], format);
      if (!srcSet) continue;
      await new Promise<void>((resolve) => {
        const img = new Image();
        // Behind anything the reader is waiting for. Not every browser honours
        // it, which is the other reason the concurrency stays small.
        img.fetchPriority = "low";
        img.decoding = "async";
        img.onload = img.onerror = () => resolve();
        // The same sizes StoryPhoto renders for a full-bleed photograph, so the
        // browser picks the same candidate here as it will there.
        img.sizes = "100vw";
        img.srcset = srcSet;
      });
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, pump));
}

/** For tests and for callers that want to know what has already been warmed. */
export function warmedSources(): readonly string[] {
  return [...warmed];
}
