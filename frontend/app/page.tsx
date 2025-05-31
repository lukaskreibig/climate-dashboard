// app/page.tsx  (or wherever your Page lives)
"use client";

import { useEffect, useState } from "react";
import IntroHero from "@/components/IntroHero";
import ChartScene from "@/components/scenes/ChartScene";
import { scenes } from "@/components/scenes/scenesConfig";
import ProgressNav from "@/components/ProgressNav";  // ← new
import ProgressTimeline from "@/components/ProgressTimeline";

interface DataJSON { [k: string]: any; }

export default function Page() {
  const [data, setData] = useState<DataJSON | null>(null);
  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(setData);
  }, []);
  if (!data) return null;

  return (
    <main className="bg-night-900 text-snow-50 relative">
      <IntroHero />
      {/* ← show your scroll progress nav */}
      {/* <ProgressNav/> */}

      
      {/* <ProgressTimeline /> */}


      {/* all your scenes */}
      {scenes.map(sc => (
        <ChartScene key={sc.key} cfg={sc} globalData={data} />
      ))}
    </main>
  );
}