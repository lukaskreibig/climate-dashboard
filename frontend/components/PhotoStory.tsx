/* ------------------------------------------------------------------
   PhotoStory.tsx   (client component)
   ------------------------------------------------------------------ */
"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import StoryPhoto from "@/components/StoryPhoto";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/reducedMotion";

/* ────────────────────────── TYPES ────────────────────────── */
export interface PhotoStoryApi {
  goToPhoto?: (i: number) => void;
}

interface Photo {
  src: string;
  alt: string;
  caption?: string;
  location?: string;
  year?: string;
}

export interface FullscreenQuoteOpts {
  fadeInAt?: number;        // default 0.10   (start 10 % into scene)
  fadeOutAt?: number;       // default 0.80   (start 80 % into scene)
  bgParallax?: number;      // default 0.10   (image drifts 10 % of VH)
    bgZoom?: number;           // NEW – default 0 | extra scale across scene (0 – 1)
  quoteParallax?: number;   // default 0.25
  quoteOffsetVH?: number;   // default 30     (VH from top)
  bgXAlign?: number;
}

interface Props {
  photos: Photo[];

  variant?: "single" | "scroll-story" | "fullscreen" | "fullscreen-split";
  imageSide?: "left" | "right";
  className?: string;

  /* scroll-story knobs */
  parallaxIntensity?: number;

  /* narrative */
  mainCaption?: string;
  author?: string;
  authorSubtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  quote?: boolean;

  /* fullscreen knobs */
  fullscreenQuoteOpts?: FullscreenQuoteOpts;
  fullscreenImageFit?: "contain" | "cover";
  /**
   * Drop the lazy attribute and ask for this photo first, rather than when it
   * approaches the viewport. Only worth it for the few photos that must not be
   * late; note that it cannot help before hydration, because ChartScene mounts
   * its visual in an effect. The head start comes from warmPhotos.
   */
  priority?: boolean;
}

/* ───────────────────── CONSTANTS ─────────────────────────── */
const BACKGROUND_HEX   = "#f8fafc";
const MAX_IMAGE_WIDTH  = 900;

/* ─────────────────────── HELPERS ─────────────────────────── */
const Figure = ({ p }: { p: Photo }) => (
  <figure
    className="relative flex items-center justify-center rounded-3xl shadow-xl overflow-hidden"
    style={{ maxWidth: MAX_IMAGE_WIDTH }}
  >
    <StoryPhoto
      src={p.src}
      alt={p.alt}
      sizes={`(max-width: 900px) 100vw, ${MAX_IMAGE_WIDTH}px`}
      className="max-h-[80vh] w-auto max-w-full h-auto object-contain"
    />
    {(p.location || p.year) && (
      <figcaption className="absolute top-3 left-3 text-xs font-medium bg-black/60 text-white px-2 py-1 rounded-sm backdrop-blur-sm">
        {p.location}
        {p.location && p.year && <span className="mx-1">·</span>}
        {p.year}
      </figcaption>
    )}
  </figure>
);

/**
 * The split scenes put a 140 px gutter beside the progress rail and a second
 * one on the inside, and below roughly 800 px those two eat the whole half
 * width. Measured on an iPhone-sized viewport of 390 px, the photo column came
 * out 164 px wide carrying 164 px of padding, so the picture rendered at zero
 * by zero and the reader saw a quote on a coloured field with no photograph at
 * all. Under this width the two halves stack, photo first.
 *
 * 800 rather than a Tailwind breakpoint because it is where the arithmetic
 * turns: half of 800, less the two gutters, still leaves the photo 236 px. A
 * landscape phone at 812 by 390 therefore stays side by side, which is right,
 * because stacking into 390 px of height would be worse.
 */
const SPLIT_STACK_BELOW = 800;

/** the progress rail is hidden below the sm breakpoint, so it needs no gutter there */
const RAIL_BREAKPOINT = 640;
const RAIL_GUTTER = 76;

const useSplitLayout = () => {
  const [layout, setLayout] = useState({ stacked: false, railGutter: 0 });

  useEffect(() => {
    const measure = () =>
      setLayout({
        stacked: window.innerWidth < SPLIT_STACK_BELOW,
        railGutter: window.innerWidth >= RAIL_BREAKPOINT ? RAIL_GUTTER : 0,
      });

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return layout;
};

const clamp01       = (v: number) =>
  Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0; // guards 0/0 → NaN during initial layout
const easeOutCubic  = (t: number) => 1 - (1 - t) ** 3;



/* ──────────────────── SHARED PIECES ──────────────────────── */

/**
 * Where the reader is inside this scene, 0 before it and 1 after it.
 *
 * All three scrolling variants wanted this and all three had written it out,
 * with the same formula and three separate listeners on the same event.
 */
const useSceneProgress = (ref: React.RefObject<HTMLElement | null>) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const host = ref.current?.closest<HTMLElement>("[data-scene]");
    if (!host) return;

    const onScroll = () => {
      const rect = host.getBoundingClientRect();
      const vh = window.innerHeight;
      setProgress(clamp01((vh - rect.top) / (vh + rect.height)));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [ref]);

  return progress;
};

interface QuoteProps {
  mainCaption?: string;
  author?: string;
  authorSubtitle?: string;
  textColor: string;
  quote: boolean;
}

const Quote = ({ mainCaption, author, authorSubtitle, textColor, quote }: QuoteProps) => (
  <div
    className={`prose prose-slate max-w-prose text-lg md:text-xl lg:text-2xl leading-relaxed ${quote ? "italic" : ""}`}
    style={{ color: textColor }}
  >
    {mainCaption && (quote ? `“${mainCaption}”` : mainCaption)}
    {author && (
      <div className="not-italic mt-6 font-semibold text-base lg:text-lg">{author}</div>
    )}
    {authorSubtitle && (
      <div className="text-sm tracking-wide" style={{ color: textColor }}>
        {authorSubtitle}
      </div>
    )}
  </div>
);

/** The fade every scrolling variant applies to its quote. */
const quoteOpacity = (progress: number, fadeInAt: number, fadeOutAt: number) => {
  if (progress < fadeInAt) return 0;
  if (progress >= fadeOutAt) return 1 - clamp01((progress - fadeOutAt) / (1 - fadeOutAt));
  return easeOutCubic(clamp01((progress - fadeInAt) / (fadeOutAt - fadeInAt)));
};

interface VariantProps {
  photos: Photo[];
  className: string;
  background: string;
  quoteNode: React.ReactNode;
  /** See PhotoStoryProps.priority: put this photo in the head, not in a scene. */
  priority?: boolean;
}

/* ───────────── VARIANT A – single ───────────── */

const Single = ({
  photos,
  idx,
  imageSide,
  className,
  background,
  quoteNode,
}: VariantProps & { idx: number; imageSide: "left" | "right" }) => (
  <section
    className={`w-full py-20 px-6 flex flex-col md:flex-row items-center justify-center gap-12 ${className}`}
    style={{ background }}
  >
    {imageSide === "left" && <Figure p={photos[idx]} />}
    <div className="flex-shrink-0">{quoteNode}</div>
    {imageSide === "right" && <Figure p={photos[idx]} />}
  </section>
);

/* ───────────── VARIANT B – scroll-story ───────────── */

const ScrollStory = ({
  photos,
  className,
  background,
  quoteNode,
  parallaxIntensity,
}: VariantProps & { parallaxIntensity: number }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const raw = useSceneProgress(wrapRef);
  const scrollProg = clamp01((raw - 0.02) / 0.7);
  const minVH = 140 + photos.length * 80;

  return (
    <section
      ref={wrapRef}
      className={`min-h-[${minVH}vh] ${className}`}
      style={{ background }}
    >
      <div
        className="sticky top-0 h-screen flex items-center justify-center px-6"
        style={{
          opacity: 1 - clamp01(scrollProg) * 1.1,
          transform: `translateY(${(1 - scrollProg) * 50}px)`,
          transition: "opacity .12s ease-out, transform .12s ease-out",
        }}
      >
        {quoteNode}
      </div>

      <div className="sticky top-0 h-screen flex items-center justify-center">
        <div
          className={`flex ${photos.length === 2 ? "gap-12" : "gap-8"} items-center justify-center max-w-7xl px-6`}
        >
          {photos.map((p, i) => (
            <motion.div
              key={p.src}
              style={{
                y:
                  -scrollProg *
                  (typeof window === "undefined" ? 0 : window.innerHeight) *
                  parallaxIntensity *
                  (0.7 + 0.3 * i),
              }}
              transition={{ type: "spring", stiffness: 60, damping: 20 }}
            >
              <Figure p={p} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ───────────── VARIANT C – fullscreen ───────────── */

const Fullscreen = ({
  photos,
  className,
  background,
  quoteNode,
  opts,
  fit: fitProp,
  priority,
  reducedMotion,
}: VariantProps & {
  opts: FullscreenQuoteOpts;
  fit?: "contain" | "cover";
  reducedMotion: boolean;
}) => {
  const {
    fadeInAt = 0.1,
    fadeOutAt = 0.8,
    bgParallax = 0.1,
    quoteParallax = 0.25,
    quoteOffsetVH = 30,
    bgXAlign = 0.5,
    bgZoom = 0,
  } = opts;

  const secRef = useRef<HTMLDivElement>(null);
  const progress = useSceneProgress(secRef);
  const opacity = quoteOpacity(progress, fadeInAt, fadeOutAt);

  const effBgParallax = reducedMotion ? 0 : bgParallax;
  const effQuoteParallax = reducedMotion ? 0 : quoteParallax;
  const effBgZoom = reducedMotion ? 0 : bgZoom;

  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  const bgY = -progress * vh * effBgParallax;
  const quoteY = -progress * vh * effQuoteParallax;
  const fit = fitProp === "cover" ? "object-cover" : "object-contain";

  const baseScale = 1 + Math.abs(effBgParallax);
  const zoomScale = effBgZoom === 0 ? baseScale : baseScale + effBgZoom * progress;

  return (
    <section
      ref={secRef}
      className={`relative h-screen w-full overflow-hidden ${className}`}
      style={{ background }}
    >
      {/* The parallax rides the wrapper so the photo underneath can be a real
          next/image and ship a phone-sized variant. */}
      <motion.div
        className="absolute inset-0"
        style={{ y: bgY, scale: zoomScale, x: bgXAlign }}
        transition={{ type: "spring", stiffness: 40, damping: 15 }}
      >
        <StoryPhoto
          src={photos[0].src}
          alt={photos[0].alt}
          fill
          sizes="100vw"
          priority={priority}
          className={`${fit} object-center`}
        />
      </motion.div>

      <motion.div
        className="absolute left-0 right-0 flex justify-center px-6 z-40"
        style={{ top: `${quoteOffsetVH}vh`, opacity, y: quoteY }}
        transition={{ type: "spring", stiffness: 40, damping: 15 }}
      >
        {quoteNode}
      </motion.div>
    </section>
  );
};

/* ───────────── VARIANT D – fullscreen-split ───────────── */

const FullscreenSplit = ({
  photos,
  className,
  background,
  quoteNode,
  opts,
  imageSide,
  reducedMotion,
}: VariantProps & {
  opts: FullscreenQuoteOpts;
  imageSide: "left" | "right";
  reducedMotion: boolean;
}) => {
  const {
    fadeInAt = 0.1,
    fadeOutAt = 0.8,
    bgParallax = 0.1,
    bgZoom = 0,
    quoteParallax = 0,
    quoteOffsetVH = 30,
    bgXAlign = 0.5,
  } = opts;

  const secRef = useRef<HTMLDivElement>(null);
  const progress = useSceneProgress(secRef);
  const { stacked, railGutter } = useSplitLayout();

  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  const offsetPx = stacked ? 0 : (quoteOffsetVH / 100) * vh;

  const GAP_VW = 6; // Seiten-Einrückung in vw
  const GAP_MIN = 24; // min px
  const GAP_MAX = 96; // max px
  const SAFE_BAR = 140; // Abstand zur Progress-Leiste

  /* Stacked: symmetrisch, nur die Leiste bekommt ihren Platz.
     Nebeneinander: Bild bekommt auf der Bar-Seite extra Puffer */
  const STACK_EDGE = "clamp(20px,5vw,40px)";
  const stackPadStyle = {
    paddingLeft: STACK_EDGE,
    paddingRight: `max(${STACK_EDGE}, ${railGutter}px)`,
  };

  const imgPadStyle = stacked
    ? stackPadStyle
    : imageSide === "left"
      ? { paddingLeft: 0, paddingRight: `clamp(${GAP_MIN}px,${GAP_VW}vw,${GAP_MAX}px)` }
      : { paddingRight: SAFE_BAR, paddingLeft: `clamp(${GAP_MIN}px,${GAP_VW}vw,${GAP_MAX}px)` };

  const textPadStyle = stacked
    ? stackPadStyle
    : imageSide === "left"
      ? { paddingLeft: `clamp(${GAP_MIN}px,${GAP_VW}vw,${GAP_MAX}px)`, paddingRight: SAFE_BAR }
      : { paddingRight: `clamp(${GAP_MIN}px,${GAP_VW}vw,${GAP_MAX}px)`, paddingLeft: SAFE_BAR };

  const opacity = quoteOpacity(progress, fadeInAt, fadeOutAt);
  const effBgParallax = reducedMotion ? 0 : bgParallax;
  /* The quote drifts against its own column on a wide screen. Stacked it has no
     column to drift in, and 0.3 of the viewport height is enough to carry it up
     over the photograph, so it holds still there. */
  const effQuoteParallax = reducedMotion || stacked ? 0 : quoteParallax;
  const effBgZoom = reducedMotion ? 0 : bgZoom;
  const bgY = -progress * vh * effBgParallax;
  const quoteY = -progress * vh * effQuoteParallax;
  const baseScale = 1 + Math.abs(effBgParallax);
  const zoomScale = effBgZoom === 0 ? baseScale : baseScale + effBgZoom * progress;
  /* subtle perspective tilt: the photo leans a few degrees as it passes,
     giving the split scenes real depth without distorting the image */
  const tilt = reducedMotion ? 0 : (0.5 - progress) * 7;

  const photoBlock = (
    <div
      className={`flex justify-center items-center ${stacked ? "w-full shrink-0" : "flex-1"}`}
      style={{ ...imgPadStyle, perspective: 1100 }}
    >
      <motion.div
        style={{
          y: bgY,
          scale: zoomScale,
          x: stacked ? 0 : imageSide === "left" ? bgXAlign + 30 : bgXAlign,
          rotateY: imageSide === "left" ? tilt : -tilt,
        }}
        transition={{ type: "spring", stiffness: 40, damping: 15 }}
      >
        <StoryPhoto
          src={photos[0].src}
          alt={photos[0].alt}
          sizes={stacked ? "100vw" : "50vw"}
          className={`${stacked ? "max-h-[46vh]" : "max-h-[90vh]"} w-auto h-auto object-contain`}
        />
      </motion.div>
    </div>
  );

  return (
    <section
      ref={secRef}
      className={`relative h-screen w-full overflow-hidden flex ${
        stacked ? "flex-col justify-center gap-6" : "items-center"
      } ${className}`}
      style={{ background }}
    >
      {/* stacked always leads with the photo, whichever side it takes on a
          wide screen, because a quote followed by its picture reads backwards */}
      {(stacked || imageSide === "left") && photoBlock}

      <motion.div
        className={`flex items-center ${stacked ? "w-full" : "flex-1"}`}
        style={{ ...textPadStyle, opacity, y: quoteY + offsetPx }}
        transition={{ type: "spring", stiffness: 40, damping: 15 }}
      >
        {quoteNode}
      </motion.div>

      {!stacked && imageSide === "right" && photoBlock}
    </section>
  );
};

/* ──────────────────── MAIN COMPONENT ─────────────────────── */

/**
 * The four variants live at module scope, and that is not tidiness.
 *
 * They used to be declared inside this component's body and rendered as
 * <Fullscreen />. That makes a NEW component type on every render of the
 * parent, so React cannot match it to the previous one: it unmounts the whole
 * subtree and mounts a fresh one. Every scroll listener is torn down and
 * rebuilt, every piece of variant state resets to zero, and the photo remounts.
 * It survived only because nothing re-rendered this component in practice, and
 * that is a property of the current call sites rather than of the code.
 */
const PhotoStory = forwardRef<PhotoStoryApi, Props>((props, ref) => {
  const {
    photos,
    variant = "single",
    imageSide = "left",
    className = "",
    mainCaption,
    author,
    authorSubtitle,
    parallaxIntensity = 1,
    fullscreenQuoteOpts,
    fullscreenImageFit,
    priority,
    backgroundColor,
    textColor = "black",
    quote = true,
  } = props;

  const background = backgroundColor ?? BACKGROUND_HEX;
  const [idx, setIdx] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useImperativeHandle(ref, () => ({
    goToPhoto: (i: number) => setIdx(Math.max(0, Math.min(i, photos.length - 1))),
  }));

  const quoteNode = (
    <Quote
      mainCaption={mainCaption}
      author={author}
      authorSubtitle={authorSubtitle}
      textColor={textColor}
      quote={quote}
    />
  );

  const shared = { photos, className, background, quoteNode };

  switch (variant) {
    case "scroll-story":
      return <ScrollStory {...shared} parallaxIntensity={parallaxIntensity} />;
    case "fullscreen":
      return (
        <Fullscreen
          {...shared}
          opts={fullscreenQuoteOpts ?? {}}
          fit={fullscreenImageFit}
          priority={priority}
          reducedMotion={reducedMotion}
        />
      );
    case "fullscreen-split":
      return (
        <FullscreenSplit
          {...shared}
          opts={fullscreenQuoteOpts ?? {}}
          imageSide={imageSide}
          reducedMotion={reducedMotion}
        />
      );
    default:
      return <Single {...shared} idx={idx} imageSide={imageSide} />;
  }
});

PhotoStory.displayName = "PhotoStory";
export default PhotoStory;
