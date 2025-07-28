// LoadingOverlay.tsx
"use client";
import { motion } from "framer-motion";

export default function LoadingOverlay({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 bg-night-900 flex flex-col
                    items-center justify-center z-[9999]">
      <div className="h-14 w-14 border-b-2 border-blue-400
                      rounded-full animate-spin mb-6" />
      <p className="mb-4 text-lg text-snow-50">
        Loading Arctic data … {Math.round(progress)} %
      </p>

      <div className="w-64 h-2 bg-slate-700 rounded">
        <motion.div
          className="h-full bg-blue-400 rounded"
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut", duration: 0.2 }}
        />
      </div>
    </div>
  );
}
