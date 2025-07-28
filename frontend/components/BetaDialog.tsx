"use client";

import { useState, useEffect } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

export default function BetaDialog({ loading, progress, onClose }: { loading, progress, onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const close = () => {
    setOpen(false);
    setTimeout(onClose, 300);
  };

  /* ESC key */
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  return (
    <AlertDialog.Root open={open}>
      <AnimatePresence>
        {open && (
          <AlertDialog.Portal forceMount>
            {/* ─── overlay ─── */}
            <AlertDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="fixed inset-0 z-[1000] bg-black backdrop-blur-sm"
              />
            </AlertDialog.Overlay>

            {/* ─── dialog ─── */}
            <AlertDialog.Content asChild className="outline-none focus:outline-none">
              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.94 }}
                animate={{ y: 0,  opacity: 1, scale: 1 }}
                exit={{   y: 40, opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-1/2 z-[1001] w-[92vw] max-w-[460px]
                           -translate-x-1/2 -translate-y-1/2 px-8 py-14 text-center text-snow-50"
              >
                {/* pill header */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center rounded-0 gap-2 text-night-900
                                  px-6 py-2 font-bold text-base">
                    Beta&nbsp;Preview
                  </div>
                </div>

                {/* close */}


                {/* copy */}
                <p className="leading-relaxed text-sm sm:text-base">
                  This interactive Arctic story is still under development.
                  You might encounter rough edges, visual hiccups or missing
                  features while I smooth things out.
                </p>

                <p className="mt-5 text-sm sm:text-base">
                  I’d love your feedback on the way!
                </p>

                {/* CTA */}
                {/* PROGRESS BAR (shown only while loading) */}
              {loading && (
                <div className="mt-8 w-full">
                  <div className="h-2 w-full rounded bg-slate-700">
                    <motion.div
                      className="h-full rounded bg-blue-400"
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: "easeOut", duration: 0.25 }}
                    />
                  </div>
                  <p className="mt-2 text-xs opacity-80">
                    Loading assets … {Math.round(progress)} %
                  </p>
                </div>
              )}
                {!loading && progress >= 100 && (
                <div className="mt-10">
                  <button
                    onClick={close}
                    className="inline-flex items-center justify-center
                               rounded-md bg-blue-600 px-6 py-3 font-semibold
                               text-white transition
                               hover:bg-blue-500 focus-visible:outline
                               focus-visible:outline-2 focus-visible:outline-offset-2
                               focus-visible:outline-blue-500"
                  >
                    Enter
                  </button>
                </div>
              )}
              </motion.div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        )}
      </AnimatePresence>
    </AlertDialog.Root>
  );
}
