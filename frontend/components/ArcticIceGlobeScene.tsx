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

/** camera ascent completes here (fraction of scene scroll), then holds while
 *  the ice retreat owns the rest. Must align with IceCapOverlay's GATE/RETREAT
 *  (gate 0.42, retreat 0.56→0.9). Generous so the pull-back zoom stays calm. */
const CAMERA_END = 0.45;
/** after the retreat + a short hold, gently fade the whole globe out so the
 *  next scene doesn't hard-cut in. */
const EXIT_START = 0.93;
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

  const handleProgress = useCallback((p: number) => {
    iceApi.current?.setProgress(p);
    const { index, visible } = decadeForProgress(p);
    setDecadeIdx(index);
    setCapVisible(visible);
    setExitFade(clamp01((p - EXIT_START) / (EXIT_END - EXIT_START)));
  }, []);

  /* forward the camera API so the scene's actions (go/getMap) keep working */
  useImperativeHandle(ref, () => ({
    go: (i: number) => mapApi.current?.go(i),
    getMap: () => mapApi.current?.getMap(),
  }), []);

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
