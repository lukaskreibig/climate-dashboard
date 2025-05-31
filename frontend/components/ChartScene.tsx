/* ChartScene – pin-on-scroll, reveal axes/helper, slide captions
   ---------------------------------------------------------------- */
"use client";

import React, { useRef, useLayoutEffect } from "react";
import { gsap }          from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export interface CaptionCfg {
  at : number;          // when to fade/slide in   (0–1)
  out?: number;         // optional fade-out time  (0–1)
  html: React.ReactNode;
}
export interface ActionCfg {
  at  : number;
  call: (api:any)=>void;
}
export interface SceneCfg {
  key       : string;
  chart     : (d:any)=>React.ReactElement;
  axesSel   : string;             // CSS selectors inside the SVG
  helperSel?: string;             // e.g. reference-lines
  captions ?: CaptionCfg[];
  actions  ?: ActionCfg[];
  pinLen   ?: number;             // vh (default = 200)
}

/* props: config + the slice of data for that chart ------------------ */
export default function ChartScene(
  { cfg, data }:{ cfg:SceneCfg; data:any }
){
  const wrapRef   = useRef<HTMLDivElement>(null);   // chart wrapper
  const capRefs   = useRef<HTMLDivElement[]>([]);   // caption nodes
  const chartRef  = useRef<any>(null);              // imperative chart API

  /* mount GSAP timeline only once ----------------------------------- */
  useLayoutEffect(()=>{
    if(!wrapRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger:{
        +     id:            cfg.key,
        trigger: wrapRef.current,
        start  : "top top",
        end    : `+=${cfg.pinLen ?? 200}%`,
        scrub  : true,
        pin    : true,
      }
    });

    /* step-0: fade wrapper in immediately (chart itself renders once) */
    tl.fromTo(wrapRef.current,
              { autoAlpha:0 }, { autoAlpha:1, duration:0.3 }, 0);

    /* step-1: GSAP hides axes/helper until 0.30 / 0.60 -------------- */
    const query = (sel?:string)=> sel
      ? wrapRef.current!.querySelectorAll<SVGElement>(sel)
      : null;

    const axes    = query(cfg.axesSel);
    const helpers = query(cfg.helperSel);

    gsap.set([axes, helpers].filter(Boolean), { autoAlpha:0 });

    axes   && tl.to(axes,   { autoAlpha:1, duration:0.3 }, 0.30);
    helpers&& tl.to(helpers,{ autoAlpha:1, duration:0.3 }, 0.60);

    /* step-2: captions --------------------------------------------- */
    cfg.captions?.forEach((c,i)=>{
      capRefs.current[i] &&
      tl.fromTo(capRefs.current[i],
                { autoAlpha:0, xPercent:15 },
                { autoAlpha:1, xPercent:0, duration:0.3 },
                c.at);
      if(c.out){
        tl.to(capRefs.current[i],
              { autoAlpha:0, duration:0.3 }, c.out);
      }
    });

    /* step-3: imperative chart actions ----------------------------- */
    cfg.actions?.forEach(a=>{
      tl.call(()=> a.call(chartRef.current), undefined, a.at);
    });

    return ()=> tl.scrollTrigger?.kill();
  },[]);

  /* render ---------------------------------------------------------- */
  return (
    <section className="relative h-screen overflow-hidden bg-slate-100">

      {/* chart – now gets pointer-events so tool-tips work */}
      <div ref={wrapRef}
           className="absolute inset-0 flex items-center
                      justify-center pointer-events-auto">
        {React.cloneElement(cfg.chart(data), { ref: chartRef })}
      </div>

      {/* captions */}
      {cfg.captions?.map((c,i)=>(
        <div key={i}
             ref={el=>{capRefs.current[i]=el!}}
             className="absolute inset-x-0 top-16 flex justify-center
                        pointer-events-none opacity-0">
          <div className="max-w-md text-center text-slate-600">
            {c.html}
          </div>
        </div>
      ))}
    </section>
  );
}
