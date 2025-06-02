"use client";

import { useEffect, useState } from "react";
import IntroHero from "@/components/IntroHero";
import ChartScene from "@/components/scenes/ChartScene";
import { scenes } from "@/components/scenes/scenesConfig";
import HorizontalDailyTunnel from "@/components/scenes/HorizontalDailyTunnelScene";

interface DataJSON{
  dailySeaIce:any[];
  annualAnomaly:any[];
  iqrStats:any;
  annual:any[];
}

export default function Page(){
  const [data,setData] = useState<DataJSON|null>(null);
  useEffect(()=>{
    fetch("/api/data").then(r=>r.json()).then(setData);
  },[]);
  if(!data) return null;

  return(
    <main className="bg-night-900 text-snow-50">
      <IntroHero/>

      {scenes.map(sc=>(
        sc.key==="daily"
          ? (
              /* inject tunnel immediately AFTER the “daily” ChartScene */
              <div key={sc.key}>
                <ChartScene cfg={sc} globalData={data}/>
                {/* <HorizontalDailyTunnel data={data.dailySeaIce}/> */}
              </div>
            )
          : <ChartScene key={sc.key} cfg={sc} globalData={data}/>
      ))}
    </main>
  );
}
