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
import Image from "next/image";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/reducedMotion";
import { imageSize } from "@/lib/imageMeta";

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
    <Image
      src={p.src}
      {...imageSize(p.src)}
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



/* ───────── helper für Half-&-Half Layout ───────── */
const GAP_VW   = "6vw";          // Innenabstand Bild-Rand  (≈ 6 % Viewportbreite)
const GAP_MIN  = 24;             // min 24 px
const GAP_MAX  = 96;             // max 96 px
const BAR_SAFE = 120;            // Abstand zur Progress-Bar

const clampGap =
  `clamp(${GAP_MIN}px,${GAP_VW},${GAP_MAX}px)`;   // CSS clamp()

const sideStyle = (side: "left" | "right") => {
  /* 1 ▸ Bild-Container – halbe Breite, aber um clampGap eingerückt */
  const imgWrap =
    side === "left"
      ? `absolute inset-y-0 left-0 pr-[${clampGap}] w-1/2`
      : `absolute inset-y-0 right-0 pl-[${clampGap}] w-1/2`;

  /* 2 ▸ Textbox direkt daneben, +BAR_SAFE Abstand zur Progress-Leiste */
  const quoteBoxBase =
    "relative z-40 flex items-center max-w-[40rem] leading-snug";

  const quoteBox =
    side === "left"
      ? `${quoteBoxBase} ml-auto pl-[${clampGap}] pr-[${BAR_SAFE}px] justify-start`
      : `${quoteBoxBase} mr-auto pr-[${clampGap}] pl-[${BAR_SAFE}px] justify-end`;

  return { imgWrap, quoteBox };
};





/* ──────────────────── MAIN COMPONENT ─────────────────────── */
const PhotoStory = forwardRef<PhotoStoryApi, Props>((props, ref) => {
  /* destructuring just once keeps the code short below */
  const {
    photos,
    variant               = "single",
    imageSide             = "left",
    className             = "",
    mainCaption,
    author,
    authorSubtitle,
    parallaxIntensity     = 1,
    fullscreenQuoteOpts,
    fullscreenImageFit,
    backgroundColor,
    textColor = "black",
    quote = true,
  } = props;

  const BG = backgroundColor ?? BACKGROUND_HEX; 

  /* internal state */
  const [idx,   setIdx]   = useState(0);
  const wrapRef           = useRef<HTMLDivElement>(null);
  const [scrollProg, setScrollProg] = useState(0);          // 0 … 1
  const reducedMotion = usePrefersReducedMotion();
  


  /* expose tiny API */
  useImperativeHandle(ref, () => ({
    goToPhoto: (i: number) =>
      setIdx(Math.max(0, Math.min(i, photos.length - 1))),
  }));
  /* ───────────── Variant-agnostic quote block ───────────── */
  const Quote = (
        <div
      className={`prose prose-slate max-w-prose text-lg md:text-xl lg:text-2xl leading-relaxed ${quote ? "italic" : ""}`}
      style={{ color: textColor }}
    >
      {mainCaption && (quote ? `“${mainCaption}”` : mainCaption)}
       {author && (
      <div className="not-italic mt-6 font-semibold text-base lg:text-lg">
        {author}
      </div>)}
      {authorSubtitle && (
        <div className="text-sm tracking-wide" style={{ color: textColor }}>
          {authorSubtitle}
        </div>
      )}
    </div>
  );

  /* ───────────── VARIANT A – single ───────────── */
  const Single = () => (
    <section
      className={`w-full py-20 px-6 flex flex-col md:flex-row items-center justify-center gap-12 ${className}`}
      style={{ background: BG }}
    >
      {imageSide === "left" && <Figure p={photos[idx]} />}
      <div className="flex-shrink-0">{Quote}</div>
      {imageSide === "right" && <Figure p={photos[idx]} />}
    </section>
  );

  /* ───────────── VARIANT B – scroll-story ───────────── */
  const ScrollStory = () => {
    /* track progress inside the local section ---------------- */
    useEffect(() => {
      const host = wrapRef.current?.closest("[data-scene]") as HTMLElement | null;
      if (!host) return;

      const onScroll = () => {
        const r  = host.getBoundingClientRect();
        const vh = window.innerHeight;
        const raw = (vh - r.top) / (r.height + vh);
        setScrollProg(clamp01((raw - 0.02) / 0.70));
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const minVH = 140 + photos.length * 80;

    return (
      <section
        ref={wrapRef}
        className={`min-h-[${minVH}vh]`}
        style={{ background: BG }}
      >
        {/* quote */}
        <div
          className="sticky top-0 h-screen flex items-center justify-center px-6"
          style={{
            opacity : 1 - clamp01(scrollProg) * 1.1,
            transform: `translateY(${(1 - scrollProg) * 50}px)`,
            transition: "opacity .12s ease-out, transform .12s ease-out",
          }}
        >
          {Quote}
        </div>

        {/* images */}
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
                    window.innerHeight *
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
  const Fullscreen = () => {
    const {
      fadeInAt      = 0.10,
      fadeOutAt     = 0.80,
      bgParallax    = 0.10,
      quoteParallax = 0.25,
      quoteOffsetVH = 30,
      bgXAlign = 0.5,
      bgZoom     = 0, 
    } = fullscreenQuoteOpts ?? {};

    const secRef           = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);

    /* robust scroll tracker (no framer hooks needed) --------- */
    useEffect(() => {
      const host = secRef.current?.closest<HTMLElement>('[data-scene]');
      if (!host) return;

      const onScroll = () => {
        const r  = host.getBoundingClientRect();
        const vh = window.innerHeight;
        const raw = (vh - r.top) / (vh + r.height);
        setProgress(clamp01(raw));
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }, []);

    /* eased opacity (fast in → slow settle) ------------------ */
    const lin  = clamp01((progress - fadeInAt) / (fadeOutAt - fadeInAt));
    const opacity = progress < fadeInAt
      ? 0
      : progress >= fadeOutAt
      ? 1 - clamp01((progress - fadeOutAt) / (1 - fadeOutAt))
      : easeOutCubic(lin);

    const effBgParallax = reducedMotion ? 0 : bgParallax;
    const effQuoteParallax = reducedMotion ? 0 : quoteParallax;
    const effBgZoom = reducedMotion ? 0 : bgZoom;

    const bgY    = -progress * window.innerHeight * effBgParallax;
    const quoteY = -progress * window.innerHeight * effQuoteParallax;
    const fit    = fullscreenImageFit === "cover" ? "object-cover" : "object-contain";

    const baseScale   = 1 + Math.abs(effBgParallax);

    // ► optional zoom (positive = zoom-in, negative = zoom-out)
    const zoomScale =
    effBgZoom === 0
        ? baseScale
        : baseScale + effBgZoom * progress;   // linear for simplicity


    return (
      <section
        ref={secRef}
        className={`relative h-screen w-full overflow-hidden ${className}`}
        style={{ background: BG }}
      >
        {/* background. The parallax rides the wrapper so the photo underneath
            can be a real next/image and ship a phone-sized variant. */}
        <motion.div
          className="absolute inset-0"
          style={{ y: bgY, scale: zoomScale, x: bgXAlign }}
          transition={{ type: "spring", stiffness: 40, damping: 15 }}
        >
          <Image
            src={photos[0].src}
            alt={photos[0].alt}
            fill
            sizes="100vw"
            className={`${fit} object-center`}
          />
        </motion.div>

        {/* quote */}
        <motion.div
          className="absolute left-0 right-0 flex justify-center px-6 z-40"
          style={{
            top: `${quoteOffsetVH}vh`,
            opacity,
            y: quoteY,
          }}
          transition={{ type: "spring", stiffness: 40, damping: 15 }}
        >
          {Quote}
        </motion.div>
      </section>
    );
  };

/* ───────────── VARIANT D – fullscreen-split ───────────── */
const FullscreenSplit = () => {
  const {
    fadeInAt   = 0.10,
    fadeOutAt  = 0.80,
    bgParallax = 0.10,
    bgZoom     = 0,
    quoteParallax = 0,
    quoteOffsetVH = 30,
    bgXAlign   = 0.5,
  } = fullscreenQuoteOpts ?? {};

  /* ── Hilfswerte ───────────────────────────────────────── */
  const { stacked, railGutter } = useSplitLayout();
  const offsetPx  = stacked ? 0 : (quoteOffsetVH / 100) * innerHeight;  // VH → px
  const GAP_VW    = 6;   // Seiten-Einrückung in vw
  const GAP_MIN   = 24;  // min  px
  const GAP_MAX   = 96;  // max  px
  const SAFE_BAR  = 140; // Abstand zur Progress-Leiste

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
      ? { paddingLeft: 0,
          paddingRight: `clamp(${GAP_MIN}px,${GAP_VW}vw,${GAP_MAX}px)` }
      : { paddingRight: SAFE_BAR,
          paddingLeft : `clamp(${GAP_MIN}px,${GAP_VW}vw,${GAP_MAX}px)` };

  const textPadStyle = stacked
    ? stackPadStyle
    : imageSide === "left"
      ? { paddingLeft : `clamp(${GAP_MIN}px,${GAP_VW}vw,${GAP_MAX}px)`,
          paddingRight: SAFE_BAR }
      : { paddingRight: `clamp(${GAP_MIN}px,${GAP_VW}vw,${GAP_MAX}px)`,
          paddingLeft : SAFE_BAR };

  /* ── Scroll-Progress (bleibt wie zuvor) ───────────────── */
  const secRef        = useRef<HTMLDivElement>(null);
  const [progress,setProgress] = useState(0);
  useEffect(()=>{ const h=secRef.current?.closest<HTMLElement>('[data-scene]');
    if(!h) return;
    const on=()=>{const r=h.getBoundingClientRect(),vh=innerHeight;
      setProgress(clamp01((vh-r.top)/(vh+r.height)));};
    addEventListener('scroll',on,{passive:true});on();
    return()=>removeEventListener('scroll',on);},[]);

  const lin      = clamp01((progress-fadeInAt)/(fadeOutAt-fadeInAt));
  const opacity  = progress<fadeInAt?0:progress>=fadeOutAt
                   ?1-clamp01((progress-fadeOutAt)/(1-fadeOutAt))
                   :easeOutCubic(lin);
  const effBgParallax = reducedMotion ? 0 : bgParallax;
  /* The quote drifts against its own column on a wide screen. Stacked it has no
     column to drift in, and 0.3 of the viewport height is enough to carry it up
     over the photograph, so it holds still there. */
  const effQuoteParallax = reducedMotion || stacked ? 0 : quoteParallax;
  const effBgZoom = reducedMotion ? 0 : bgZoom;
  const bgY      = -progress*innerHeight*effBgParallax;
  const quoteY   = -progress*innerHeight*effQuoteParallax;
  const baseScale=1+Math.abs(effBgParallax);
  const zoomScale=effBgZoom===0?baseScale:baseScale+effBgZoom*progress;
  /* subtle perspective tilt: the photo leans a few degrees as it passes,
     giving the split scenes real depth without distorting the image */
  const tilt = reducedMotion ? 0 : (0.5 - progress) * 7;

  /* ── Render ───────────────────────────────────────────── */
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
        transition={{ type:"spring", stiffness:40, damping:15 }}
      >
        <Image
          src={photos[0].src} alt={photos[0].alt}
          {...imageSize(photos[0].src)}
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
      style={{ background: BG }}
    >
      {/* stacked always leads with the photo, whichever side it takes on a
          wide screen, because a quote followed by its picture reads backwards */}
      {(stacked || imageSide === "left") && photoBlock}

      {/* Text */}
      <motion.div
        className={`flex items-center ${stacked ? "w-full" : "flex-1"}`}
        style={{ ...textPadStyle, opacity, y: quoteY + offsetPx }}
        transition={{ type:"spring", stiffness:40, damping:15 }}
      >
        {Quote}
      </motion.div>

      {!stacked && imageSide === "right" && photoBlock}
    </section>
  );
};




  /* ───────────── RENDER SWITCH ───────────── */
  switch (variant) {
    case "scroll-story": return <ScrollStory />;
    case "fullscreen":   return <Fullscreen  />;
    case "fullscreen-split": return <FullscreenSplit/>;
    default:             return <Single      />;
  }
});

PhotoStory.displayName = "PhotoStory";
export default PhotoStory;
