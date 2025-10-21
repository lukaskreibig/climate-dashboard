/* ------------------------------------------------------------------
   HorizontalDailyTunnel  (v1.2 — pinned, wheel-driven)
------------------------------------------------------------------ */
"use client";

import React,{useRef,useState,useLayoutEffect} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DailyChart from "@/components/Rechart/DailyAnomalyChartRecharts";
gsap.registerPlugin(ScrollTrigger);

/* ---------- constants --------------------------------------- */
const FIRST = 1980;
const LAST  = 2025;
const YEARS = LAST - FIRST + 1;
const VH_PER_STEP = 15;                 /* 15 vh per extra year */

/* ---------- props ------------------------------------------- */
interface Row { Year:number; DayOfYear:number; Extent?:number|null }
interface Props{ data:Row[] }

/* ============================================================ */
export default function HorizontalDailyTunnel({data}:Props){
  const sec = useRef<HTMLElement>(null);
  const api = useRef<any>(null);
  const [mounted,setMounted] = useState(false);

  useLayoutEffect(()=>{ if(!sec.current) return;
    const shift = (YEARS-1)*100;               // % translation
    const vDist = YEARS*VH_PER_STEP;           // total scroll distance

    const ctx=gsap.context(()=>{

      /* pin & translate the track ---------------------------- */
      gsap.to(".tunnel-track",{
        xPercent:-shift,
        ease:"none",
        scrollTrigger:{
          trigger:sec.current,
          start:"top top",
          end:`+=${vDist}vh`,
          scrub:true,
          pin:true,
          anticipatePin:1
        }
      });

      /* add one year per step -------------------------------- */
      for(let i=0;i<YEARS-1;i++){
        ScrollTrigger.create({
          trigger:sec.current,
          start:`top+=${i*VH_PER_STEP}vh top`,
          onEnter:    ()=>api.current?.addYear?.(),
          onEnterBack:()=>api.current?.addYear?.()
        });
      }

      /* mount chart lazily ----------------------------------- */
      ScrollTrigger.create({
        trigger:sec.current,start:"top bottom",once:true,
        onEnter:()=>setMounted(true)
      });

    },sec);
    return ()=>ctx.revert();
  },[]);

  /* render ---------------------------------------------------- */
  return(
    <section
      ref={sec}
      className="relative h-screen w-screen touch-pan-y"
      style={{ overscrollBehaviorX:"contain" }}
    >
      <div className="tunnel-track flex h-full"
           style={{ width:`${YEARS*100}vw` }}>
        {/* keep first chart centred */}
        <div className="w-screen flex items-center justify-center"/>
        {/* chart */}
        <div className="w-screen flex items-center justify-center">
          <div className="w-full lg:w-2/3 max-w-[900px]">
            {mounted
              ? <DailyChart data={data} chosenYear={FIRST} apiRef={api}/>
              : <div className="h-[400px]"/>}
          </div>
        </div>
        {/* trailing empty panels */}
        {Array.from({length:YEARS-2}).map((_,i)=>(
          <div key={i} className="w-screen"/>
        ))}
      </div>
    </section>
  );
}
