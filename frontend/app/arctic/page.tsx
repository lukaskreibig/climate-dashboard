// "use client"
// import { useState, useEffect, useRef } from "react"
// import Image from "next/image"
// import { motion, AnimatePresence } from "framer-motion"
// import { gsap } from "gsap"
// import { ScrollTrigger } from "gsap/ScrollTrigger"
// import { useGSAP } from "@gsap/react"
// import dynamic from "next/dynamic"

// import IntroHero            from "@/components/IntroHero"
// import { ChartContainer }   from "@/components/ChartContainer"
// import { Toggle }           from "@/components/Toggle"

// /* ------------------------------------------------------------------
//    GSAP plugin registration
// -------------------------------------------------------------------*/
// if (typeof window !== "undefined" && !gsap.core.globals().ScrollTrigger) {
//   gsap.registerPlugin(ScrollTrigger)
// }

// /* ------------------------------------------------------------------
//    Dynamic imports – IDENTICAL paths & props as your Mantine version
// -------------------------------------------------------------------*/
// const SeasonalLinesChartD3    = dynamic(()=>import("@/components/d3/SeasonalLinesChart"),{ssr:false})
// const RollingChartD3          = dynamic(()=>import("@/components/d3/RollingChart"),{ssr:false})
// const AnnualAnomalyBarChartD3 = dynamic(()=>import("@/components/d3/AnnualAnomalyBarChart"),{ssr:false})
// const IQRChartD3              = dynamic(()=>import("@/components/d3/IQRChart"),{ssr:false})
// const DailyAnomalyChartD3     = dynamic(()=>import("@/components/d3/DailyAnomalyChart"),{ssr:false})
// const MultiLineChartD3        = dynamic(()=>import("@/components/d3/MultiLineChart"),{ssr:false})
// const ZScoreChartD3           = dynamic(()=>import("@/components/d3/ZScoreChart"),{ssr:false})
// const BarChart2024D3          = dynamic(()=>import("@/components/d3/BarChart2024"),{ssr:false})
// const ScatterChartD3          = dynamic(()=>import("@/components/d3/ScatterChart"),{ssr:false})
// const HeatmapChartD3          = dynamic(()=>import("@/components/d3/HeatmapChart"),{ssr:false})

// const SeasonalLinesChartRe    = dynamic(()=>import("@/components/Rechart/SeasonalLinesChartRecharts"),{ssr:false})
// const AnnualAnomalyBarRe      = dynamic(()=>import("@/components/Rechart/AnnualAnomalyBarChartRecharts"),{ssr:false})
// const IQRChartRe              = dynamic(()=>import("@/components/Rechart/IQRChartRecharts"),{ssr:false})
// const DailyAnomalyChartRe     = dynamic(()=>import("@/components/Rechart/DailyAnomalyChartRecharts"),{ssr:false})
// const MultiLineChartRe        = dynamic(()=>import("@/components/Rechart/MultiLineRecharts"),{ssr:false})
// const ZScoreChartRe           = dynamic(()=>import("@/components/Rechart/ZScoreChartRecharts"),{ssr:false})
// const BarChart2024Re          = dynamic(()=>import("@/components/Rechart/BarChart2024Recharts"),{ssr:false})
// const ScatterChartRe          = dynamic(()=>import("@/components/Rechart/ScatterChartRecharts"),{ssr:false})
// const HeatMapChartRe          = dynamic(()=>import("@/components/Rechart/HeatMapChartRecharts"),{ssr:false})

// /* ------------------------------------------------------------------
//    Data interfaces (unchanged)
// -------------------------------------------------------------------*/
// interface AnnualRow { Year:number; AnnualAnomaly?:number|null }
// interface DailyRow  { Year:number; DayOfYear:number; Extent?:number }
// interface DataJSON  {
//   annual:AnnualRow[];
//   dailySeaIce:DailyRow[];
//   annualAnomaly:{Year:number;AnnualAnomaly:number|null}[];
//   corrMatrix:any[];
//   iqrStats:any[];
//   partial2025:any[];
// }

// /* ------------------------------------------------------------------
//    Page component
// -------------------------------------------------------------------*/
// export default function Page() {

//   /* ---------- fetch data -----------------------------------------*/
//   const [annual,setAnnual]         = useState<AnnualRow[]>([])
//   const [daily,setDaily]           = useState<DailyRow[]>([])
//   const [annualAnom,setAnnualAnom] = useState<{Year:number;AnnualAnomaly:number|null}[]>([])
//   const [corr,setCorr]             = useState<any[]>([])
//   const [iqr,setIqr]               = useState<any[]>([])
//   const [partial,setPartial]       = useState<any[]>([])

//   useEffect(()=>{
//     fetch("/api/data").then(r=>r.json()).then((j:DataJSON)=>{
//       setAnnual(j.annual); setDaily(j.dailySeaIce); setAnnualAnom(j.annualAnomaly)
//       setCorr(j.corrMatrix); setIqr(j.iqrStats); setPartial(j.partial2025)
//     })
//   },[])

//   /* ---------- UI toggles -----------------------------------------*/
//   const [year,setYear] = useState(2024)
//   const [lib,setLib]   = useState<Record<string,"d3"|"recharts">>({
//     seasonal:"d3",rolling:"d3",annual:"recharts",iqr:"recharts",daily:"recharts",
//     multi:"recharts",z:"recharts",bar24:"recharts",scatter:"recharts",heat:"recharts"
//   })
//   const [active,setActive] = useState(-1)

//   /* ---------- Year select inline ---------------------------------*/
//   function YearSelect(){
//     return (
//       <div className="flex items-center gap-2">
//         <span className="text-sm">Year:</span>
//         <select value={year} onChange={e=>setYear(+e.target.value)}
//           className="rounded border px-2 py-1 text-sm bg-night-950 text-snow-50">
//           {Array.from({length:50},(_,i)=>1975+i).map(y=>(
//             <option key={y}>{y}</option>))}
//           <option>2025</option>
//         </select>
//       </div>
//     )
//   }

//   /* ---------- Scenes ---------------------------------------------*/
//   const scenes = [
//     {
//       title:"Arctic Panorama",
//       text:"Beyond numbers: a fragile, breathtaking landscape.",
//       Graphic:()=>(
//         <div className="relative w-[95vw] aspect-video">
//           <Image src="/images/heartofaseal-28.jpg" alt="Arctic panorama"
//             fill sizes="95vw" className="object-cover"/>
//         </div>)
//     },
//     {
//       title:"Seasonal Sea-Ice Lines",
//       text:"Daily melt–freeze cycles reveal the Arctic’s natural rhythm.",
//       Graphic:()=>(
//         <ChartContainer title="Seasonal Sea-Ice Lines (Daily)"
//           headerExtra={<Toggle group="seasonal" lib={lib} setLib={setLib}/>}>
//           {lib.seasonal==="d3"
//             ? <SeasonalLinesChartD3 data={daily}/>
//             : <SeasonalLinesChartRe  data={daily}/> }
//         </ChartContainer>)
//     },

//     /* … the remaining 10 scenes identical to previous answer … */
//     {
//       title:"365-Day Rolling Average",
//       text:"Smoothed trajectory shows relentless decline.",
//       Graphic:()=>(
//         <ChartContainer title="365-Day Rolling Average"
//           headerExtra={<Toggle group="rolling" lib={lib} setLib={setLib}/>}>
//           {lib.rolling==="d3"
//             ? <RollingChartD3 data={daily}/>
//             : <RollingChartRe  data={daily}/> }
//         </ChartContainer>)
//     },
//     {
//       title:"Annual Anomalies",
//       text:"Loss is the new normal — every recent bar is below zero.",
//       Graphic:()=>(
//         <ChartContainer title="Annual Sea-Ice Extent Anomalies"
//           headerExtra={<Toggle group="annual" lib={lib} setLib={setLib}/>}>
//           {lib.annual==="d3"
//             ? <AnnualAnomalyBarChartD3 data={annualAnom}/>
//             : <AnnualAnomalyBarRe      data={annualAnom}/> }
//         </ChartContainer>)
//     },
//     {
//       title:"Daily IQR Envelope",
//       text:"Historical spread vs. current season.",
//       Graphic:()=>(
//         <ChartContainer title="Daily IQR Envelope"
//           headerExtra={<Toggle group="iqr" lib={lib} setLib={setLib}/>}>
//           {lib.iqr==="d3"
//             ? <IQRChartD3 data={daily}/>
//             : <IQRChartRe  stats={iqr} partial2025={partial}/> }
//         </ChartContainer>)
//     },
//     {
//       title:"Daily Anomaly",
//       text:"Pick a year to see divergence.",
//       Graphic:()=>(
//         <ChartContainer title="Daily Anomaly of a Year"
//           headerExtra={<YearSelect/>}>
//           {lib.daily==="d3"
//             ? <DailyAnomalyChartD3 data={daily} chosenYear={year}/>
//             : <DailyAnomalyChartRe  data={daily} chosenYear={year}/> }
//         </ChartContainer>)
//     },
//     {
//       title:"Temperature & CO₂",
//       text:"The Arctic warms twice as fast as the globe.",
//       Graphic:()=>(
//         <ChartContainer title="Temperature & CO₂ Over Time"
//           headerExtra={<Toggle group="multi" lib={lib} setLib={setLib}/>}>
//           {lib.multi==="d3"
//             ? <MultiLineChartD3 data={annual} linesActive={{Arctic:true,Global:true,CO2:true}}/>
//             : <MultiLineChartRe  data={annual}/> }
//         </ChartContainer>)
//     },
//     {
//       title:"Z-Score Anomalies",
//       text:"Common scale reveals Arctic as clear outlier.",
//       Graphic:()=>(
//         <ChartContainer title="Z-Score Anomalies"
//           headerExtra={<Toggle group="z" lib={lib} setLib={setLib}/>}>
//           {lib.z==="d3"
//             ? <ZScoreChartD3 data={annual} inverted={false}/>
//             : <ZScoreChartRe  data={annual} inverted={false}/> }
//         </ChartContainer>)
//     },
//     {
//       title:"2024 Split-Bar",
//       text:"Arctic vs. global anomalies in the latest year.",
//       Graphic:()=>(
//         <ChartContainer title="2024 Arctic vs Global"
//           headerExtra={<Toggle group="bar24" lib={lib} setLib={setLib}/>}>
//           <div className="flex flex-col gap-4 md:flex-row">
//             <p>Arctic warming ≈ 2× global mean.</p>
//             {lib.bar24==="d3"
//               ? <BarChart2024D3 data={annual}/>
//               : <BarChart2024Re  data={annual}/> }
//           </div>
//         </ChartContainer>)
//     },
//     {
//       title:"Scatter: Temp vs Sea-Ice",
//       text:"Higher temps, less ice – unmistakeable negative trend.",
//       Graphic:()=>(
//         <ChartContainer title="Scatter: Global Temp vs Sea-Ice"
//           headerExtra={<Toggle group="scatter" lib={lib} setLib={setLib}/>}>
//           {lib.scatter==="d3"
//             ? <ScatterChartD3 data={annual}/>
//             : <ScatterChartRe  data={annual}/> }
//         </ChartContainer>)
//     },
//     {
//       title:"Correlation Heat-Map",
//       text:"Pearson > 0.9 links CO₂, global warmth & Arctic response.",
//       Graphic:()=>(
//         <ChartContainer title="Correlation Heat-Map"
//           headerExtra={<Toggle group="heat" lib={lib} setLib={setLib}/>}>
//           {lib.heat==="d3"
//             ? <HeatmapChartD3 data={annual}/>
//             : <HeatMapChartRe data={corr} rowDomain={['Global Temp','Arctic Temp','CO₂']}
//                                            colDomain={['Global Temp','Arctic Temp','CO₂']}/> }
//         </ChartContainer>)
//     },
//   ] as const

//   /* ---------- ScrollTrigger activation --------------------------*/
//   const sectionRefs = useRef<Array<HTMLElement|null>>([])
//   useGSAP(()=>{
//     sectionRefs.current.forEach((el,i)=>{
//       if(!el) return
//       ScrollTrigger.create({
//         trigger:el,
//         start:"top 70%",
//         end:"bottom 30%",
//         onEnter:()=>setActive(i),
//         onEnterBack:()=>setActive(i),
//       })
//     })
//   },[])

//   /* ---------- render -------------------------------------------*/
//   return (
//     <main className="relative">
//       <IntroHero/>

//       {/* Sticky graphic */}
//       {active>=0 && (
//         <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center">
//           <AnimatePresence mode="wait">
//             <motion.div key={active}
//               initial={{y:30,opacity:0}}
//               animate={{y:0,opacity:1}}
//               exit={{y:-30,opacity:0}}
//               transition={{duration:0.6}}
//               className="w-[95vw]">
//               {scenes[active].Graphic()}
//             </motion.div>
//           </AnimatePresence>
//         </div>
//       )}

//       {/* Narrative cards */}
//       <div className="pl-[5vw]">
//         {scenes.map((s,i)=>(
//           <section key={i}
//             ref={el=>sectionRefs.current[i]=el}
//             className="flex min-h-[140vh] items-center">
//             <motion.div
//               initial={{x:-50,opacity:0}}
//               whileInView={{x:0,opacity:1}}
//               viewport={{once:true,margin:"-20%"}}
//               transition={{duration:0.6}}
//               className="w-[40vw] max-w-[560px]">
//               <div className="rounded-lg bg-night-900 p-6 text-snow-50 shadow-xl">
//                 <h3 className="mb-2 font-display text-xl">{s.title}</h3>
//                 <p className="text-lg leading-relaxed">{s.text}</p>
//               </div>
//             </motion.div>
//           </section>
//         ))}
//       </div>
//       <div className="h-32" />
//     </main>
//   )
// }
