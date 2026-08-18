/**
 * Warm the photographs the story is about to show.
 *
 * WHY THEY ARRIVE LATE. Not the optimiser. Measured against production first: a
 * cold variant costs 1.9 s and 226 KB out of a 960 KB original, and every
 * request after that is served from cache for a year, so moving the resize to
 * build time would have bought almost nothing. The actual cause is that
 * ChartScene mounts its visual only after hydration, so until then no photo
 * exists in the document at all and the browser has nothing to fetch. What is
 * missing is telling it early.
 *
 * WHY AN IMAGE ELEMENT AND NOT fetch(). This started as fetch() and the first
 * measurement killed it. /_next/image answers Vary: Accept, and it means it:
 *
 *   Accept: image/avif,image/webp,*\/*   ->  Content-Type: image/avif
 *   Accept: *\/*        (what fetch sends)  ->  Content-Type: image/jpeg
 *
 * Same URL, two different files. The warm pulled down a JPEG nobody would ever
 * ask for, and when the scene finally rendered the browser fetched the AVIF
 * anyway. Strictly worse than not warming. An HTMLImageElement sends the
 * browser's own image Accept header, so it warms the byte-identical response
 * the <img> will later be handed.
 *
 * WHY THE WHOLE SRCSET. Letting the browser choose from the same candidate list
 * with the same sizes string is what makes the warm and the real load agree. It
 * used to compute the width here, which meant reimplementing next/image's
 * selection and being wrong the day a `sizes` changed.
 *
 * WHY NOT EVERYTHING, AND WHY ONE AT A TIME. The photographs come to 12 MB, so
 * warming them all would compete with the map tiles for the same connection.
 * The caller therefore passes only the ones reached before there is any chance
 * to fetch them on the way.
 *
 * The serial part is about the server, not the reader. Each warm can trigger a
 * cold AVIF encode in the image optimiser, and libaom is expensive: measured
 * against `next start`, four photos warmed two at a time push the process tree
 * 442 MB above idle, one at a time 289 MB. The container has 512 MB and has
 * been killed for it. Half a second of extra wall clock buys 153 MB, and the
 * warm has tens of seconds of runway before the first photo is due.
 */

/** next/image's default deviceSizes; next.config.ts does not override them. */
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const;

/** next/image's default quality. Another value would warm a different file. */
const QUALITY = 75;

/**
 * The sizes string of PhotoStory's fullscreen variant, which is what every
 * photo warmed here is drawn with. Viewport based, so the choice does not
 * depend on layout having settled.
 */
const FULLSCREEN_SIZES = "100vw";

const warmed = new Set<string>();

/** The exact URL next/image requests for one candidate width. */
export function nextImageUrl(src: string, width: number, quality = QUALITY): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

/** The candidate list next/image emits for a `sizes` based image. */
export function nextImageSrcSet(src: string): string {
  return DEVICE_SIZES.map((w) => `${nextImageUrl(src, w)} ${w}w`).join(", ");
}

/**
 * Warm `sources`, at most `concurrency` in flight.
 *
 * Resolves when the last one has settled. Failures are swallowed: a warm that
 * does not arrive is a photo that loads normally later, never a broken page.
 */
export function warmPhotos(
  sources: readonly string[],
  { concurrency = 1, sizes = FULLSCREEN_SIZES }: { concurrency?: number; sizes?: string } = {},
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const queue = sources.filter((src) => !warmed.has(src));
  if (!queue.length) return Promise.resolve();
  queue.forEach((src) => warmed.add(src));

  let cursor = 0;
  const pump = async (): Promise<void> => {
    while (cursor < queue.length) {
      const src = queue[cursor++];
      await new Promise<void>((resolve) => {
        const img = new Image();
        // Behind anything the reader is waiting for. Not every browser honours
        // it, which is the other reason the concurrency stays at one.
        img.fetchPriority = "low";
        img.decoding = "async";
        img.onload = img.onerror = () => resolve();
        img.sizes = sizes;
        img.srcset = nextImageSrcSet(src);
      });
    }
  };

  return Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, pump),
  ).then(() => undefined);
}

/** For tests and for callers that want to know what has already been warmed. */
export function warmedSources(): readonly string[] {
  return [...warmed];
}
