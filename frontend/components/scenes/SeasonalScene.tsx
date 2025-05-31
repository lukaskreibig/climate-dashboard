// components/scenes/SeasonalScene.tsx
"use client";

import React,{useRef,useLayoutEffect,useState} from "react";
import { gsap }              from "gsap";
import { ScrollTrigger }     from "gsap/ScrollTrigger";
import Toggle                from "@/components/Toggle";
import SeasonalLinesChartRecharts from "@/components/Rechart/SeasonalLinesChartRecharts";
import SeasonalLinesChart         from "@/components/d3/SeasonalLinesChart";

gsap.registerPlugin(ScrollTrigger);

interface Row { Year:number; DayOfYear:number; Extent?:number|null }
interface Props{ data:Row[] }

/* helper – poll until selector finds at least one node */
const waitFor = (root:HTMLElement, selector:string) =>
  new Promise<NodeListOf<Element>>(resolve=>{
    const found = () => root.querySelectorAll(selector);
    let n = found();
    if (n.length) return resolve(n);
    const id = setInterval(()=>{
      n=found();
      if (n.length){ clearInterval(id); resolve(n); }
    }, 30);
  });

export default function SeasonalScene({ data }:Props){
  const secRef   = useRef<HTMLElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const cap1Ref  = useRef<HTMLDivElement>(null);
  const cap2Ref  = useRef<HTMLDivElement>(null);

  const [lib,setLib] = useState<"d3"|"recharts">("recharts");

  useLayoutEffect(()=>{
    /** ------------------------------------------------------------------
     * 1. create an *empty* timeline immediately – section is pinned/scrubbed
     * ------------------------------------------------------------------ */
    const tl  = gsap.timeline({
      scrollTrigger:{
        trigger:secRef.current!,
        start:"top top",
        end:"+=200%",
        pin:true,
        scrub:true,
      }
    });

    // fade-in wrapper itself (always plays, even while we’re still waiting)
    tl.fromTo(wrapRef.current!,{autoAlpha:0},{autoAlpha:1,duration:0.4},0);

    /** ------------------------------------------------------------------
     * 2. once Recharts has rendered its SVG, plug the nodes
     *    into the already-running timeline and refresh ScrollTrigger
     * ------------------------------------------------------------------ */
    (async()=>{
      const root = wrapRef.current!;
      const [gridAxes, refs] = await Promise.all([
        waitFor(root,".chart-grid, .chart-axis"),
        waitFor(root,".chart-ref")
      ]);

      gsap.set([gridAxes,refs],{autoAlpha:0});          // hide instantly

      tl.to(gridAxes,{autoAlpha:1,duration:0.4},0.30)   // axes + grid @30 %
        .to(refs,    {autoAlpha:1,duration:0.4},0.60)   // ref-lines   @60 %
        .fromTo(cap1Ref.current!,{autoAlpha:0,xPercent:15},
                                {autoAlpha:1,xPercent:0,duration:0.3},0.15)
        .to    (cap1Ref.current!,{autoAlpha:0,duration:0.3},0.55)
        .fromTo(cap2Ref.current!,{autoAlpha:0,xPercent:15},
                                {autoAlpha:1,xPercent:0,duration:0.3},0.65);

      ScrollTrigger.refresh();                          // pin values are now correct
    })();

    return ()=>{ tl.scrollTrigger?.kill(); tl.kill(); };
  },[]);

  /* ------------------------------------------------------------------ */
  return(
    <section ref={secRef}
             className="relative h-screen overflow-hidden bg-slate-100">
      <div className="absolute top-6 right-6 z-50">
        <Toggle lib={lib} setLib={setLib}/>
      </div>

      <div ref={wrapRef}
           className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {lib==="d3"
          ? <SeasonalLinesChart data={data}/>
          : <SeasonalLinesChartRecharts data={data}/> }
      </div>

      <div ref={cap1Ref}
           className="absolute inset-x-0 top-16 flex justify-center pointer-events-none opacity-0">
        <div className="max-w-md text-center text-slate-600">
          <h3 className="text-2xl font-display mb-2">Seasonal Sea-Ice Lines</h3>
          <p className="text-lg">
            Arctic sea-ice breathes with the seasons. Over decades, winter crests
            have lowered and summer troughs deepened – tracing a slow retreat.
          </p>
        </div>
      </div>

      <div ref={cap2Ref}
           className="absolute inset-x-0 top-16 flex justify-center pointer-events-none opacity-0">
        <div className="max-w-md text-center text-slate-600">
          <h3 className="text-2xl font-display mb-2">Extremes Highlighted</h3>
          <p className="text-lg">
            Dashed lines now mark the record-high and record-low sea-ice days.
          </p>
        </div>
      </div>
    </section>
  );
}
