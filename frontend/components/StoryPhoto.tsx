"use client";

import { forwardRef } from "react";

import { PHOTO_VARIANTS } from "@/lib/photoVariants";

/**
 * A photograph, served from files encoded at build time.
 *
 * WHY NOT next/image. Because the encode moved out of the request. next/image
 * resizes and compresses inside the running server, and libaom is expensive out
 * of all proportion to the file it produces: measured against `next start`, one
 * 2800 px AVIF encode takes the process from 55 MB to 312 MB, and four warmed
 * photos pushed the tree 442 MB above idle on a 512 MB container that was being
 * killed for it. scripts/gen-photo-variants.mjs now does that work once.
 *
 * WHY NOT next/image WITH A CUSTOM LOADER, which would have kept the component
 * untouched. A loader has the signature ({src, width, quality}) => string. It
 * never sees the Accept header, so it cannot answer AVIF to one reader and WebP
 * to another; every candidate in the srcset is the same format. Choosing a
 * format there means choosing which readers get a broken image, and around 5
 * percent of readers cannot decode AVIF. On these scenes a failed photograph is
 * not a degraded photograph, it is a pull quote floating over an empty screen.
 *
 * So: a <picture>, which does the negotiation in the browser with no server
 * involved. AVIF for the 95 percent, WebP for almost all of the rest, and the
 * original JPEG underneath for anyone else. That is the same three-way answer
 * /_next/image was giving per request, decided in markup instead.
 */

/** The file the browser gets if it can decode neither modern format. */
const original = (src: string) => src;

const variantUrl = (stem: string, width: number, format: "avif" | "webp") =>
  `/photos/${stem}-${width}.${format}`;

/**
 * The candidate list for one format.
 *
 * Exported because lib/photoWarmup.ts has to warm the exact same candidates,
 * and because a srcset that drifts from the files on disk is a 404 nobody sees
 * until a reader with the wrong screen arrives.
 */
export function photoSrcSet(src: string, format: "avif" | "webp"): string {
  const variant = PHOTO_VARIANTS[src];
  if (!variant) return "";
  return variant.widths.map((w) => `${variantUrl(variant.stem, w, format)} ${w}w`).join(", ");
}

interface Common {
  src: string;
  alt: string;
  className?: string;
  /**
   * Fill the nearest positioned ancestor, the way next/image's `fill` did.
   * Carries no width or height, because in this mode the parent reserves the
   * box and an intrinsic aspect ratio would fight it.
   */
  fill?: boolean;
  /** Load it now rather than when it nears the viewport. */
  priority?: boolean;
  style?: React.CSSProperties;
}

/**
 * Either the photo is laid out by the page, and then it needs a `sizes` telling
 * the browser how wide it will end up, or it is drawn at a fixed box, and then
 * `sizes` follows from that box and stating it twice is a chance to disagree
 * with yourself. The union makes each call site say which it is; there is no
 * default, because a wrong `sizes` is invisible until someone opens the page on
 * the one screen it is wrong for.
 */
export type StoryPhotoProps = Common &
  (
    | {
        /**
         * Identical for both formats, deliberately. A mismatch would have AVIF
         * and WebP readers pick different widths, so any measurement of one
         * would stop describing the other.
         */
        sizes: string;
        width?: undefined;
        height?: undefined;
      }
    | {
        sizes?: undefined;
        /** A fixed box, like the 24 px avatar cut from a 500 px portrait. */
        width: number;
        height: number;
      }
  );

/**
 * The ref lands on the <img>, not on the <picture>, because that is the element
 * GSAP animates in both heroes.
 */
const StoryPhoto = forwardRef<HTMLImageElement, StoryPhotoProps>(function StoryPhoto(
  { src, alt, sizes, className, fill, priority, width, height, style },
  ref,
) {
  const variant = PHOTO_VARIANTS[src];
  const avif = photoSrcSet(src, "avif");
  const webp = photoSrcSet(src, "webp");
  const resolvedSizes = sizes ?? `${width}px`;

  return (
    /* display: contents, so the <picture> generates no box of its own. Without
       it the element sits in the flow as an inline box and a filled photo would
       position against the wrong ancestor. */
    <picture className="contents">
      {avif && <source type="image/avif" srcSet={avif} sizes={resolvedSizes} />}
      {webp && <source type="image/webp" srcSet={webp} sizes={resolvedSizes} />}
      {/* A plain <img>, on purpose: the point of this component is that
          next/image is not in the request path. */}
      <img
        ref={ref}
        src={original(src)}
        alt={alt}
        {...(fill ? {} : { width: width ?? variant?.width, height: height ?? variant?.height })}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={fill ? `absolute inset-0 h-full w-full ${className ?? ""}` : className}
        style={style}
      />
    </picture>
  );
});

export default StoryPhoto;
