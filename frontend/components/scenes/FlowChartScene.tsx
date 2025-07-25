/* ------------------------------------------------------------------
   FlowChartScene.tsx  –  charts & captions scroll *together* (inline)
   Compatible with the old SceneCfg/CaptionCfg API.
------------------------------------------------------------------- */
"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

export interface CaptionCfg {
  html         : React.ReactNode;
  captionSide? : "left" | "right";
  boxClass?    : string;
  at?          : number;   out?      : number;
  axesInIdx?   : number;   axesOutIdx?: number;
  helperInIdx? : number;   helperOutIdx?: number;
}

export interface SceneCfg {
  key          : string;
  chart        : (d:any,api:React.MutableRefObject<any>) => JSX.Element;
  axesSel      : string;
  helperSel?   : string;
  captions     : CaptionCfg[];
  chartSide?   : "left" | "right" | "center" | "fullscreen";
  wide?        : boolean;
  axesInIdx?   : number; axesOutIdx?  : number;
  helperInIdx? : number; helperOutIdx?: number;
  actions?     : { captionIdx:number; call:(api?:any)=>void }[];
}

export const NO_MATCH="*:not(*)";

/* helper – wait until lazy-charts mount */
const waitFor=(root:HTMLElement,sel:string)=>new Promise<void>(res=>{
  if(sel===NO_MATCH) return res();
  const loop=()=>root.querySelector(sel)?res():requestAnimationFrame(loop);
  loop();
});

/* ================================================================== */
export default function FlowChartScene(
  {cfg,globalData}:{cfg:SceneCfg;globalData:any;}
){
  const sec  = useRef<HTMLElement>(null);               // section root
  const api  = useRef<any>(null);                       // expose chart API
  const [mounted,setMounted]=useState(false);           // lazy-mount chart

  useLayoutEffect(()=>{
    if(!sec.current) return;

    const ctx=gsap.context(()=>{

      /* ───────── fade-in section on entry (optional) ───────── */
      gsap.fromTo(sec.current,{opacity:0},{opacity:1,duration:.6,
        scrollTrigger:{trigger:sec.current,start:"top 95%"} });

      /* ───────── axes/helper fades tied to caption idx ─────── */
      (async()=>{
        await waitFor(sec.current!,cfg.axesSel);
        if(cfg.helperSel) await waitFor(sec.current!,cfg.helperSel);

        const axesSel=cfg.axesSel, helpSel=cfg.helperSel;
        if(axesSel!==NO_MATCH) gsap.set(axesSel,{opacity:0});
        if(helpSel)            gsap.set(helpSel,{opacity:0});

        const N         = cfg.captions.length,
              capEl=(i:number)=>sec.current!
                .querySelector<HTMLElement>(`[data-cap-idx="${i}"] .caption-box`)!,
              clip =(n:number)=>Math.max(0,Math.min(N-1,n));

        const axesIn = clip(cfg.axesInIdx??0), axesOut = cfg.axesOutIdx??N;
        const helIn  = clip(cfg.helperInIdx??axesIn), helOut = cfg.helperOutIdx??axesOut;

        const fade=(sel:string,v:number)=>gsap.to(sel,{opacity:v,duration:.4,paused:true});
        const hook=(sel:string,inIdx:number,outIdx:number)=>{
          ScrollTrigger.create({
            trigger:capEl(inIdx),start:"top 80%",animation:fade(sel,1),
            toggleActions:"play none none none"});
          if(outIdx>=0&&outIdx<N){
            ScrollTrigger.create({
              trigger:capEl(outIdx),start:"bottom top",animation:fade(sel,0),
              toggleActions:"play none reverse none"});
          }
        };
        if(axesSel!==NO_MATCH) hook(axesSel,axesIn,axesOut);
        if(helpSel)            hook(helpSel,helIn ,helOut );

        /* custom caption-trigger actions */
        cfg.actions?.forEach(({captionIdx,call})=>{
          ScrollTrigger.create({
            trigger:capEl(clip(captionIdx)),start:"top 90%",
            onEnter:()=>call(api.current), onEnterBack:()=>call(api.current)
          });
        });
      })();

      /* ───────── caption slide-ins ───────── */
      cfg.captions.forEach((c,i)=>{
        const el=sec.current!.querySelector<HTMLElement>(
          `[data-cap-idx="${i}"] .caption-box`);
        if(!el) return;

        const fromX=
          c.captionSide==="left" ? "-3rem":
          c.captionSide==="right"? "3rem" :"0";

        const fracIn =(c.at ?? i*0.05)-1;
        const fracOut=(c.out??1.01)     -1;

        gsap.fromTo(el,{opacity:0,x:fromX,y:"2rem"},{opacity:1,x:0,y:0,
          ease:"power2.out",
          scrollTrigger:{
            trigger:sec.current,
            start:()=>`top+=${window.innerHeight*fracIn} bottom`,
            end  :()=>`top+=${window.innerHeight*fracOut} top`,
            scrub:.3}});
      });

    },sec);
    return()=>ctx.revert();
  },[cfg]);

  /* mount chart when first caption nears viewport */
  useLayoutEffect(()=>{
    if(!sec.current) return;
    const trig=ScrollTrigger.create({
      trigger:sec.current,start:"top 90%",
      onEnter:()=>setMounted(true),once:true
    });
    return()=>trig.kill();
  },[]);

  /* ---------- helpers --------------------------------------- */
  const chartAlign =
    cfg.chartSide==="left" ?"sm:flex-row":
    cfg.chartSide==="right"?"sm:flex-row-reverse":"sm:flex-col";

  const chartBoxClasses =
    cfg.chartSide==="fullscreen"
      ? "w-full h-[70vh] sm:h-screen"   /* big chart blocks */
      : "w-full sm:w-3/5 lg:w-1/2 max-w-[900px]";

  const captionText = (side?:"left"|"right") =>
    side ? (side==="left"?"text-left":"text-right") : "text-center";

  const capFlex = (side?:"left"|"right") =>
    side==="left" ?"items-start sm:pr-14":
    side==="right"?"items-end   sm:pl-14":
                   "items-center";

  /* ---------- render --------------------------------------- */
  return(
    <section ref={sec} data-scene={cfg.key} className="relative py-[40vh]">
      {/* chart + caption blocks stacked inside normal flow ----- */}
      {cfg.captions.map((c,i)=>(
        <div key={i} className={`mb-[80vh] flex flex-col ${chartAlign}`} data-cap-idx={i}>
          {/* chart */}
          <div className={`mx-auto ${chartBoxClasses}`}>
            {/* mount chart only once per scene (first time) */}
            {i===0 && mounted ? cfg.chart(globalData,api) : i===0?<div className="w-full h-full"/>:null}
          </div>

          {/* caption */}
          <div className={`mt-8 sm:mt-0 sm:w-2/5 px-6 caption-box pointer-events-none ${captionText(c.captionSide)} ${capFlex(c.captionSide)}`}>
            <div className={
              c.boxClass
              ? `${c.boxClass} ${captionText(c.captionSide)}`
              : `bg-white/90 rounded-lg shadow-lg p-6 ${captionText(c.captionSide)}`
            }>
              {c.html}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
