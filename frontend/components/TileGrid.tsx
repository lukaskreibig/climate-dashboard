/* ------------------------------------------------------------------
   components/PipelineModal/TileGrid.tsx
   6-tile preview grid  ·  Radix Tooltip wrapped
------------------------------------------------------------------ */
"use client";

import React from "react";
import Image from "next/image";
import * as Tooltip from "@radix-ui/react-tooltip";

/* ——— props must match what PipelineModalBtn forwards ——— */
interface Masks {
  rgb: string;
  cloud: string;
  land: string;
  iceSolid: string;
  iceThin: string;
  overlay: string;
}

/* helper for one tile ---------------------------------------------------- */
function MaskTile({
  src,
  label,
}: {
  src: string;
  label: string;
}) {
  return (
    <Tooltip.Root delayDuration={200}>
      <Tooltip.Trigger asChild>
        <div className="relative aspect-square w-full overflow-hidden rounded shadow">
          <Image
            src={src}
            alt={label}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
          />
          {/* overlay label */}
          <span className="absolute bottom-0 left-0 w-full bg-black/40 py-1 text-center text-xs text-white backdrop-blur">
            {label}
          </span>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content
        side="top"
        className="rounded bg-slate-800 px-2 py-1 text-xs text-white shadow"
      >
        {label}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

/* ——— GRID component (export default) ----------------------------------- */
export default function TileGrid({
  rgb,
  cloud,
  land,
  iceSolid,
  iceThin,
  overlay,
}: Masks) {
  return (
    /* The provider fixes the “Tooltip must be used within TooltipProvider” error */
    <Tooltip.Provider>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MaskTile src={rgb}       label="RGB (true-colour)" />
        <MaskTile src={cloud}     label="Cloud mask" />
        <MaskTile src={land}      label="Land mask" />
        <MaskTile src={iceSolid}  label="Solid ice mask" />
        <MaskTile src={iceThin}   label="Thin ice mask" />
        <MaskTile src={overlay}   label="Final overlay" />
      </div>
    </Tooltip.Provider>
  );
}

/* ------------------------------------------------------------------
   No other files touched – the modal now works without runtime errors
------------------------------------------------------------------ */
