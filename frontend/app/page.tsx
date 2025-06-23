"use client";

import { useEffect, useState } from "react";
import IntroHero from "@/components/IntroHero";
import ChartScene from "@/components/scenes/ChartScene";
import { scenes } from "@/components/scenes/scenesConfig";
import ChatBot from "@/components/ChatBot";
import StoryProgress from "@/components/StoryProgress";
import IceTilt from "@/components/IceTilt";

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
    <>
    <main className="bg-night-900 text-snow-50">
      <IntroHero/>

        {scenes.map(sc=>(
        <div id="firstChartAnchor" key={sc.key}>
          <ChartScene key={sc.key} cfg={sc} globalData={data}/>
        </div>      
        ))}

       <ChatBot/>
    </main>
   <StoryProgress />

    </>

  );
}
