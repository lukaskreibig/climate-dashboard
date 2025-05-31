/* ------------------------------------------------------------------
   CAPTION-LOCKED chart scene   (v9.13 – v8-Timeline + index helpers)
------------------------------------------------------------------ */
"use client";

import React,{useLayoutEffect,useRef,useState} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

/* ---------- public types ------------------------------------ */
export interface CaptionCfg{
  html:React.ReactNode;
  axesInIdx?:number;  axesOutIdx?:number;
  helperInIdx?:number;helperOutIdx?:number;
}
export interface SceneCfg{
  key:string;
  chart:(d:any,api:React.MutableRefObject<any>)=>JSX.Element;
  axesSel:string; helperSel?:string;
  captions:CaptionCfg[];
  axesInIdx?:number;  axesOutIdx?:number;
  helperInIdx?:number;helperOutIdx?:number;
  actions?:{captionIdx:number;call:(api?:any)=>void}[];
}
export const NO_MATCH="*:not(*)";

/* wait until first node appears -------------------------------- */
const waitFor=(root:HTMLElement,sel:string)=>
  new Promise<void>(res=>{
    if(sel===NO_MATCH){res();return;}
    const poll=()=>root.querySelector(sel)?res():requestAnimationFrame(poll);
    poll();
  });

/* ---------- component --------------------------------------- */
export default function ChartScene({cfg,globalData}:{cfg:SceneCfg;globalData:any}){
  const sec  = useRef<HTMLElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const api  = useRef<any>(null);
  const [mounted,setMounted] = useState(false);   // controls chart render

  useLayoutEffect(()=>{ if(!sec.current||!wrap.current) return;

    /* ---------------------------------------------------------
       1. v8-Style Fade-Timeline   (one per scene)
    ---------------------------------------------------------- */
    const screens = cfg.captions.length + 1;
    const fadeTL  = gsap.timeline({
      scrollTrigger:{
        id      :`${cfg.key}-fade`,
        trigger :sec.current!,
        start   :"top top",
        end     :"+=100vh",     // nur für Fade-Scrub
        scrub   :0.5
      }
    });

    fadeTL.fromTo(
      wrap.current,
      {opacity:0,visibility:"hidden"},
      {opacity:1,visibility:"visible",duration:0.4},
      0
    )
    /* Chart mount **nach** Fade-Start – Animation ist sichtbar */
    .call(()=>!mounted&&setMounted(true),undefined,0.1);

    /* ---------------------------------------------------------
       2. Helper / Grid IN-/OUT via Caption-Indizes
    ---------------------------------------------------------- */
    (async()=>{
      await waitFor(wrap.current!,cfg.axesSel);
      if(cfg.helperSel) await waitFor(wrap.current!,cfg.helperSel);

      if(cfg.axesSel!==NO_MATCH) gsap.set(cfg.axesSel,{opacity:0});
      if(cfg.helperSel)          gsap.set(cfg.helperSel,{opacity:0});

      const N = cfg.captions.length,
            clamp = (x:number)=>Math.max(0,Math.min(N-1,x));
      const ai = clamp(cfg.axesInIdx   ??1);
      const ao = cfg.axesOutIdx  ??N;    // >=N ⇒ kein Out
      const hi = clamp(cfg.helperInIdx ??ai);
      const ho = cfg.helperOutIdx??ao;

      const cap=(i:number)=>sec.current!
        .querySelector<HTMLElement>(`[data-cap-idx="${i}"]`)!;
      const tween=(sel:string,v:number)=>gsap.to(sel,{opacity:v,duration:0.4,paused:true,immediateRender:false});

      const IN  ="play none none reverse";   // Vorwärts an, rückwärts aus
      const OUT ="play none reverse none";

      const bind=(sel:string,iIn:number,iOut:number)=>{
        ScrollTrigger.create({
          trigger:cap(iIn),start:"top center",
          animation:tween(sel,1),toggleActions:IN
        });
        if(iOut<N){
          ScrollTrigger.create({
            trigger:cap(iOut),start:"bottom top",
            animation:tween(sel,0),toggleActions:OUT
          });
        }
      };

      if(cfg.axesSel!==NO_MATCH) bind(cfg.axesSel,ai,ao);
      if(cfg.helperSel)          bind(cfg.helperSel,hi,ho);

      /* -------------------------------------------------------
         3. Caption-basierte Actions beidseitig
      -------------------------------------------------------- */
      cfg.actions?.forEach(a=>{
        const trg=cap(clamp(a.captionIdx));
        ScrollTrigger.create({
          trigger:trg,start:"top center",
          onEnter:    ()=>a.call(api.current),
          onEnterBack:()=>a.call(api.current)
        });
      });
    })();

    /* cleanup */
    return ()=>fadeTL.scrollTrigger?.kill();
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  },[cfg]);

  /* ---------------- render ---------------------------------- */
  return(
    <section ref={sec} className="relative">
      <div ref={wrap}
           className="sticky top-0 h-screen flex items-center justify-center bg-slate-100 z-10">
        {mounted ? cfg.chart(globalData,api) : <div className="w-full h-full"/>}
      </div>

      {/* captions */}
      {cfg.captions.map((c,i)=>(
        <div key={i} data-cap-idx={i}
             className="relative h-screen flex items-center justify-center pointer-events-none z-20">
          <div className="max-w-md p-6 bg-white/90 rounded-lg shadow-lg text-center text-slate-900">
            {c.html}
          </div>
        </div>
      ))}

      <div className="relative h-screen"/>
    </section>);
}
