/* ------------------------------------------------------------------
   components/PipelineModal/PipelineModalBtn.tsx
   Radix UI dialog + existing Tailwind styles          ·  no shadcn dep
------------------------------------------------------------------ */
"use client";

import React from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";

// import TileGrid from "./TileGrid";          // stays exactly the same

/* ——— prop types stay unchanged ——— */
interface Props {
  diagram: string;
  masks: {
    rgb: string;
    cloud: string;
    land: string;
    iceSolid: string;
    iceThin: string;
    overlay: string;
  };
}

/* ——— Component ——— */
export default function PipelineModalBtn({ diagram, masks }: Props) {
  return (
    <Dialog.Root>
      {/* ---------- trigger button ---------- */}
      <Dialog.Trigger asChild>
        <button
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-600
                     px-4 py-2 text-white transition hover:bg-sky-700"
        >
          Pipeline&nbsp;Methodology&nbsp;↗
        </button>
      </Dialog.Trigger>

      {/* ---------- modal overlay ---------- */}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />

        {/* ---------- content box ---------- */}
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-4xl
                     max-h-[90vh] -translate-x-1/2 -translate-y-1/2
                     overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"
        >
          {/* close “×” button (top-right) */}
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 text-xl text-slate-500
                         hover:text-slate-700"
              aria-label="Close"
            >
              ×
            </button>
          </Dialog.Close>

          {/* ---------- headline ---------- */}
          <Dialog.Title className="text-xl font-semibold mb-4">
            Image-Segmentation Pipeline&nbsp;
            <span className="text-slate-500">(Sentinel-2, 13 bands)</span>
          </Dialog.Title>

          {/* ---------- pipeline diagram ---------- */}
          <Image
            src={diagram}
            alt="Pipeline diagram"
            width={1200}
            height={600}
            className="mb-8 h-auto w-full rounded border"
          />

          {/* ---------- grid of mask stages ----------
          <TileGrid {...masks} /> */}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// /* re-export so scenesConfig can `import { TileGrid } from …/PipelineModal` */
// export { TileGrid };
