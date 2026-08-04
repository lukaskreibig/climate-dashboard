/* ------------------------------------------------------------------
   ArcticIceGlobeScene.tsx · the Act-3 spatial hero.

   The scroll-linked camera ascends from Uummannaq to the whole Arctic;
   Mapbox switches to a 3-D globe; then real NSIDC September sea-ice
   rasters retreat decade by decade (1980 → 2024) as the ice cap visibly
   shrinks. A progress-driven year label narrates the retreat, since the
   scene's captions can only sit at the start of the scroll.

   Forwards the MapFly camera API upward so the scene's `actions`
   (reduced-motion `go(last)`) still steer the camera.
------------------------------------------------------------------ */
"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Bebas_Neue } from "next/font/google";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import MapFlyScene, { MapFlyApi, Waypoint } from "./MapFlyScene";
import IceCapOverlay, { IceCapApi, ICE_DECADES, decadeForProgress } from "./IceCapOverlay";
import { prefersReducedMotion } from "@/lib/reducedMotion";

const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"] });

/** Timing is tied to the scene's caption layout (5 caption screens + 2 trailing
 *  screens, see scenesConfig "Arctic Sea Ice"): the camera lands while caption 1
 *  frames the globe, the cap fades in behind it, and the decade captions 2-4 sit
 *  on top of the actual retreat. Must stay in step with IceCapOverlay's
 *  GATE (0.26→0.35) and RETREAT (0.36→0.80). */
const CAMERA_END = 0.28;
/** after the retreat + a hold on 2024, fade the globe out over the last screens */
const EXIT_START = 0.88;
const EXIT_END = 1.0;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

interface Props {
  waypoints: Waypoint[];
}

const ArcticIceGlobeScene = forwardRef<MapFlyApi, Props>(function ArcticIceGlobeScene(
  { waypoints },
  ref
) {
  const { t } = useTranslation();
  const mapApi = useRef<MapFlyApi | null>(null);
  const iceApi = useRef<IceCapApi | null>(null);
  const [decadeIdx, setDecadeIdx] = useState(0);
  const [capVisible, setCapVisible] = useState(false);
  const [exitFade, setExitFade] = useState(0);

  /** set by the scene's caption actions; while null the scroll drives the year */
  const pinnedDecade = useRef<number | null>(null);

  const handleProgress = useCallback((p: number) => {
    iceApi.current?.setProgress(p);
    if (pinnedDecade.current === null) {
      const { index } = decadeForProgress(p);
      setDecadeIdx(index);
    }
    setCapVisible(decadeForProgress(p).visible);
    setExitFade(clamp01((p - EXIT_START) / (EXIT_END - EXIT_START)));
  }, []);

  /* forward the camera API, plus the caption-driven decade control so the year
     label and the ice cap are always set from the same instruction */
  useImperativeHandle(ref, () => ({
    go: (i: number) => mapApi.current?.go(i),
    getMap: () => mapApi.current?.getMap(),
    showDecade: (index: number) => {
      const clamped = Math.max(0, Math.min(ICE_DECADES.length - 1, index));
      pinnedDecade.current = clamped;
      setDecadeIdx(clamped);
      setCapVisible(true);
      iceApi.current?.showDecade(clamped);
    },
  } as MapFlyApi & { showDecade: (index: number) => void }), []);

  /* reduced motion: onProgress never fires — settle on the latest cap + ghost */
  useEffect(() => {
    if (!prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      if (mapApi.current?.getMap()) {
        iceApi.current?.showLatest();
        setDecadeIdx(ICE_DECADES.length - 1);
        setCapVisible(true);
        window.clearInterval(id);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  const year = ICE_DECADES[decadeIdx];

  return (
    <div className="relative w-full h-full" style={{ opacity: 1 - exitFade }}>
      <MapFlyScene
        ref={mapApi}
        waypoints={waypoints}
        scrollCamera
        globe
        cameraEnd={CAMERA_END}
        onProgress={handleProgress}
      />

      <IceCapOverlay ref={iceApi} mapRef={mapApi} />

      {/* progress-driven year label — narrates the retreat over the spacer screens */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-[14vh] flex flex-col items-center transition-opacity duration-[900ms] ease-out ${
          capVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-sky-100 drop-shadow-[0_1px_10px_rgba(2,6,23,0.95)]">
          {t("scenes.arcticGlobe.septemberIce")}
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={year}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`${bebasNeue.className} text-7xl md:text-8xl leading-none text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]`}
          >
            {year}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* data attribution */}
      <div className="pointer-events-none absolute bottom-3 right-4 text-[0.62rem] tracking-wide text-slate-300/60">
        {t("scenes.arcticGlobe.attribution")}
      </div>

      {/* screen-reader summary of the animated retreat */}
      <span role="img" aria-label={t("scenes.arcticGlobe.aria")} className="sr-only" />
    </div>
  );
});

ArcticIceGlobeScene.displayName = "ArcticIceGlobeScene";
export default ArcticIceGlobeScene;
