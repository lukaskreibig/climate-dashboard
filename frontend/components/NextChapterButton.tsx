"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function NextChapterButton() {
  const router = useRouter();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className="
        mt-8 rounded-full px-6 py-3
        bg-arctic-500 hover:bg-arctic-600 text-snow-50
        font-semibold shadow-lg focus:outline-none focus:ring-4
        focus:ring-arctic-300 transition-colors
      "
      onClick={() => router.push("/chapter2")}
    >
      ▶  Start Chapter 2
    </motion.button>
  );
}
