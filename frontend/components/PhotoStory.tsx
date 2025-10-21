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
import { motion } from "framer-motion";

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
    <img
      src={p.src}
      alt={p.alt}
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

const clamp01       = (v: number) => Math.max(0, Math.min(1, v));
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

    const bgY    = -progress * window.innerHeight * bgParallax;
    const quoteY = -progress * window.innerHeight * quoteParallax;
    const fit    = fullscreenImageFit === "cover" ? "object-cover" : "object-contain";

    const baseScale   = 1 + Math.abs(bgParallax);

    // ► optional zoom (positive = zoom-in, negative = zoom-out)
    const zoomScale =
    bgZoom === 0
        ? baseScale
        : baseScale + bgZoom * progress;   // linear for simplicity


    return (
      <section
        ref={secRef}
        className={`relative h-screen w-full overflow-hidden ${className}`}
        style={{ background: BG }}
      >
        {/* background */}
        <motion.img
            src={photos[0].src}
            alt={photos[0].alt}
            className={`absolute inset-0 w-full h-full ${fit} object-center`}
            style={{ y: bgY, scale: zoomScale, x: bgXAlign }}

            transition={{ type: "spring", stiffness: 40, damping: 15 }}
            />

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
  const offsetPx  = (quoteOffsetVH / 100) * innerHeight;     // VH → px
  const GAP_VW    = 6;   // Seiten-Einrückung in vw
  const GAP_MIN   = 24;  // min  px
  const GAP_MAX   = 96;  // max  px
  const SAFE_BAR  = 140; // Abstand zur Progress-Leiste

  /* Einrückungen – Bild bekommt auf der Bar-Seite extra Puffer */
  const imgPadStyle =
    imageSide === "left"
      ? { paddingLeft: 0,
          paddingRight: `clamp(${GAP_MIN}px,${GAP_VW}vw,${GAP_MAX}px)` }
      : { paddingRight: SAFE_BAR,
          paddingLeft : `clamp(${GAP_MIN}px,${GAP_VW}vw,${GAP_MAX}px)` };

  const textPadStyle =
    imageSide === "left"
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
  const bgY      = -progress*innerHeight*bgParallax;
  const quoteY   = -progress*innerHeight*quoteParallax;
  const baseScale=1+Math.abs(bgParallax);
  const zoomScale=bgZoom===0?baseScale:baseScale+bgZoom*progress;

  /* ── Render ───────────────────────────────────────────── */
  return (
    <section
      ref={secRef}
      className={`relative h-screen w-full overflow-hidden flex items-center ${className}`}
      style={{ background: BG }}
    >

      {/* Bild links */}
      {imageSide==="left"&&(
        <div className="flex-1 flex justify-center items-center" style={imgPadStyle}>
          <motion.img
            src={photos[0].src} alt={photos[0].alt}
            className="max-h-[90vh] w-auto object-contain"
            style={{ y:bgY, scale:zoomScale, x:bgXAlign + 30 }}
            transition={{ type:"spring", stiffness:40, damping:15 }}
          />
        </div>
      )}

      {/* Text */}
      <motion.div
        className="flex-1 flex items-center"
        style={{ ...textPadStyle, opacity, y: quoteY + offsetPx }}
        transition={{ type:"spring", stiffness:40, damping:15 }}
      >
        {Quote}
      </motion.div>

      {/* Bild rechts */}
      {imageSide==="right"&&(
        <div className="flex-1 flex justify-center items-center" style={imgPadStyle}>
          <motion.img
            src={photos[0].src} alt={photos[0].alt}
            className="max-h-[90vh] w-auto object-contain"
            style={{ y:bgY, scale:zoomScale, x:bgXAlign }}
            transition={{ type:"spring", stiffness:40, damping:15 }}
          />
        </div>
      )}
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
