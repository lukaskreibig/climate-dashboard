"use client";

import { Button } from "./ui/button";

export default function Toggle({
  lib,
  setLib,
}: {
  lib: "d3" | "recharts";
  setLib: (l: "d3" | "recharts") => void;
}) {
  return (
    <Button
      onClick={() => setLib(lib === "d3" ? "recharts" : "d3")}
      className="rounded border border-snow-50/30 px-2 py-1 text-xs hover:bg-snow-50/10 transition"
    >
      {lib === "d3" ? "Switch to Recharts" : "Switch to D3"}
    </Button>
  );
}
