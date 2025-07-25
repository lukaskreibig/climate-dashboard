"use client";

import React, { useState, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WhyArcticExplainerProps {
  apiRef?: React.MutableRefObject<any>;
}

/*───────────────────────────────────────────────────────────────
  Arctic Albedo Explainer
────────────────────────────────────────────────────────────────*/
const WhyArcticExplainer: React.FC<WhyArcticExplainerProps> = ({ apiRef }) => {
  const [stage, setStage] = useState(1);

  /* parent (ChartScene) can change stage via api.showStage(n) */
  useImperativeHandle(apiRef, () => ({ showStage: (s: number) => setStage(s) }), []);

  /* palette */
  const waterColor = "#0EA5E9";
  const sunColor   = "#FDE047";

  /* constant incoming-ray angle */
  const rayDeg = 25;

  /* reflection only when ice exists */
  const hasReflection = stage < 3;

  return (
    <div className="w-full h-screen bg-gradient-to-b from-sky-200 via-sky-100 to-blue-100 relative overflow-hidden text-[14px]">

      {/*────────────────  CLOUDS  ──────────────────────────*/}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`cloud-${i}`}
            className="absolute bg-white rounded-full opacity-30"
            style={{
              width : `${40 + Math.sin(i) * 20}px`,
              height: `${20 + Math.cos(i) * 10}px`,
              left  : `${10 + i * 12}%`,
              top   : `${15 + Math.sin(i * 2) * 10}%`
            }}
          />
        ))}
      </div>

      {/*────────────────  SUN DISC  ─────────────────────────*/}
      <motion.div
        className="absolute top-16 right-16 w-20 h-20 rounded-full"
        style={{ backgroundColor: sunColor, boxShadow: `0 0 30px ${sunColor}`, border: "2px solid #FEF08A" }}
        initial={{ scale: 0.9, opacity: 0.9 }}
        animate={{ scale: stage >= 2 ? 1.2 : 0.9, opacity: stage >= 2 ? 1 : 0.9 }}
        transition={{ duration: 0.9 }}
      />

      {/*────────────────  PRIMARY RAY  ───────────────────────*/}
      <AnimatePresence>
        {stage >= 1 && (
          <motion.div
            key="ray-in"
            className="absolute origin-top pointer-events-none"
            style={{
              width : "14px",
              height: "500px",
              right : "105px",
              top   : "120px",
              borderRadius: "7px",
              background : "linear-gradient(to bottom, rgba(253,224,71,0.95) 100%, rgba(253,224,71,0.05) 90%)",
              boxShadow  : "0 0 28px rgba(253,224,71,0.65)",
              rotate     : rayDeg
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
          />
        )}
      </AnimatePresence>

      {/*────────────────  REFLECTED RAY  ─────────────────────*/}
      <AnimatePresence>
        {hasReflection && (
          <motion.div
            key="ray-reflect"
            className="absolute origin-bottom pointer-events-none"
            style={{
              width  : "14px",
              height : "260px",
              right  : "260px",
              bottom : "40%",
              borderRadius: "7px",
              background : "linear-gradient(to top, rgba(253,224,71,0.95) 0%, rgba(253,224,71,0.05) 100%)",
              boxShadow  : "0 0 18px rgba(253,224,71,0.55)",
              rotate     : -rayDeg
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: stage === 2 ? 0.55 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
          />
        )}
      </AnimatePresence>

      {/*────────────────  OCEAN & ICE  ───────────────────────*/}
      <div className="absolute bottom-0 left-0 w-full h-2/5" style={{ backgroundColor: waterColor }}>
        {/* waves */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`wave-${i}`}
              className="absolute w-full h-[2px] bg-sky-300"
              style={{ top: `${10 + i * 20}%` }}
              animate={{ x: ["-100%", "100%"], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 4 + i * 0.5, repeat: Infinity, repeatType: "loop", delay: i * 0.8 }}
            />
          ))}
        </div>

        {/* shrinking ice sheet – faster to free up time for stage 3 */}
        <motion.div
          className="absolute right-0 top-0 h-full"
          initial={{ width: "50%" }}
          animate={{ width: stage === 1 ? "50%" : stage === 2 ? "35%" : "15%" }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          style={{
            background : "linear-gradient(to left, #ffffff 0%, #f8fafc 80%, #e2e8f0 100%)",
            borderLeft : "2px solid rgba(148,163,184,0.6)",
            clipPath   : stage === 1
              ? "polygon(0% 0%, 100% 0%, 100% 100%, 5% 100%, 2% 95%, 0% 85%, 3% 75%, 0% 65%, 2% 55%, 0% 45%, 4% 35%, 0% 25%, 2% 15%, 0% 5%)"
              : stage === 2
              ? "polygon(0% 5%, 100% 0%, 100% 100%, 8% 100%, 5% 90%, 2% 80%, 6% 70%, 1% 60%, 4% 50%, 0% 40%, 7% 30%, 2% 20%, 5% 10%)"
              : "polygon(0% 10%, 100% 0%, 100% 100%, 12% 100%, 8% 85%, 4% 75%, 9% 65%, 3% 55%, 7% 45%, 2% 35%, 10% 25%, 4% 15%)"
          }}
        />

        {/* ice-bergs – drift quicker so they’re gone sooner */}
        <AnimatePresence>
          {stage >= 2 && (
            <motion.div key="bergs" className="absolute inset-0 pointer-events-none">
              {/* big berg */}
              <motion.div
                className="absolute bg-white"
                style={{
                  right       : "35%",
                  top         : "60%",
                  width       : "80px",
                  height      : "50px",
                  clipPath    : "polygon(15% 0%, 85% 5%, 100% 40%, 90% 85%, 60% 100%, 20% 95%, 0% 60%, 10% 25%)",
                  border      : "2px solid rgba(148,163,184,0.6)",
                  boxShadow   : "0 6px 20px rgba(0,0,0,0.25), 0 -3px 10px rgba(255,255,255,0.4)",
                  borderRadius: "2px"
                }}
                initial={{ opacity: 0 }}
                animate={{
                  x     : stage === 3 ? -120 : -60,
                  y     : [0, 3, 0],
                  rotate: [4, 2, 4],
                  opacity: stage === 3 ? 0 : 1,
                  scale : stage === 3 ? 0.6 : 1
                }}
                transition={{
                  x      : { duration: 2.2, ease: "easeOut" },
                  opacity: { duration: stage === 3 ? 1.3 : 0.9 },
                  scale  : { duration: stage === 3 ? 1.3 : 0.9 },
                  y      : { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                  rotate : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
                }}
              />

              {/* medium berg */}
              <motion.div
                className="absolute bg-white"
                style={{
                  right       : "38%",
                  top         : "66%",
                  width       : "65px",
                  height      : "40px",
                  clipPath    : "polygon(20% 10%, 80% 0%, 100% 30%, 95% 70%, 75% 100%, 25% 90%, 0% 65%, 5% 35%)",
                  border      : "2px solid rgba(148,163,184,0.6)",
                  boxShadow   : "0 5px 16px rgba(0,0,0,0.22), 0 -2px 8px rgba(255,255,255,0.4)",
                  borderRadius: "2px"
                }}
                initial={{ opacity: 0 }}
                animate={{
                  x     : stage === 3 ? -100 : -50,
                  y     : [1, 4, 1],
                  rotate: [-3, -1, -3],
                  opacity: stage === 3 ? 0 : 1,
                  scale : stage === 3 ? 0.5 : 1
                }}
                transition={{
                  x      : { duration: 2.4, ease: "easeOut" },
                  opacity: { duration: stage === 3 ? 1.1 : 0.8 },
                  scale  : { duration: stage === 3 ? 1.1 : 0.8 },
                  y      : { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
                  rotate : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
                }}
              />

              {/* small shards (stage 2 only) */}
              {stage === 2 && (
                <>
                  {[...Array(2)].map((_, i) => (
                    <motion.div
                      key={`shard-${i}`}
                      className="absolute bg-white"
                      style={{
                        right       : `${40 + i * 3}%`,
                        top         : `${60 + i * 6}%`,
                        width       : "45px",
                        height      : "30px",
                        clipPath    : "polygon(25% 0%, 100% 15%, 85% 70%, 60% 100%, 15% 85%, 0% 40%)",
                        border      : "1px solid rgba(148,163,184,0.5)",
                        boxShadow   : "0 4px 12px rgba(0,0,0,0.18), 0 -1px 6px rgba(255,255,255,0.3)",
                        borderRadius: "2px"
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ x: -60 - i * 10, y: [1, 3, 1], rotate: [5, -5, 5], opacity: 1 }}
                      transition={{
                        x      : { duration: 2.1 + i * 0.3, ease: "easeOut" },
                        y      : { duration: 2.8 + i * 0.3, repeat: Infinity, ease: "easeInOut" },
                        rotate : { duration: 2.8 + i * 0.3, repeat: Infinity, ease: "easeInOut" },
                        opacity: { duration: 0.8 }
                      }}
                    />
                  ))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* heat bubbles – unchanged */}
        <AnimatePresence>
          {stage === 3 && (
            <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={`heat-${i}`}
                  className="absolute bg-red-500 rounded-full"
                  style={{ left: `${8 + i * 9}%`, bottom: "18px", width: "16px", height: "16px" }}
                  initial={{ y: 0, opacity: 0.9, scale: 0.4 }}
                  animate={{ y: -70, opacity: 0, scale: [0.4, 1.6, 0.1] }}
                  transition={{ duration: 4.8, delay: i * 0.25, repeat: Infinity, repeatType: "loop", repeatDelay: 2 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/*────────────────  THERMOMETER (stage 3)  ───────────────*/}
      <AnimatePresence>
        {stage === 3 && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            <div className="bg-red-500 text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg">
              🌡️ +2 °C Faster
            </div>
            <motion.div
              className="absolute inset-0 bg-red-400 rounded-full -z-10"
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/*────────────────  LABELS  ─────────────────────────────*/}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="absolute bottom-32 right-16 text-center"
        >
          <div className="bg-white bg-opacity-95 px-4 py-3 rounded-lg shadow-lg border border-sky-200">
            <div className="font-bold text-slate-800 text-lg">Sea Ice Reflects</div>
            <div className="text-sm text-sky-700 font-medium">90 % of sunlight</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="absolute bottom-32 left-16 text-center"
        >
          <div className="bg-white bg-opacity-95 px-4 py-3 rounded-lg shadow-lg border border-sky-200">
            <div className="font-bold text-slate-800 text-lg">Open Water Absorbs</div>
            <div className="text-sm text-sky-700 font-medium">90 % of sunlight</div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/*────────────────  PROGRESS DOTS  ─────────────────────*/}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-3">
        {[1, 2, 3].map(n => (
          <div
            key={`dot-${n}`}
            className={`w-3 h-3 rounded-full transition-all duration-500 ${
              stage >= n ? "bg-sky-600 scale-110" : "bg-sky-300 bg-opacity-50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default WhyArcticExplainer;
