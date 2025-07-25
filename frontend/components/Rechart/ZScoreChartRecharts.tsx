"use client";
import React, { useState, useMemo, useImperativeHandle } from "react";
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from "recharts";

/* ------------- types -------------------------------------------- */
export interface RowZ {
  Year:number;
  Arctic_z?:number|null;
  SeaIce_z?:number|null;
  SeaIce_z_inv?:number|null;
  GlobCO2Mean_z?:number|null;
}
interface Props {
  data    : RowZ[];
  inverted?: boolean;
  apiRef? : React.MutableRefObject<any>;
}

const HEADLINE = (
  <>
    Comparing atmospheric&nbsp;CO₂&nbsp;
    <span className="inline-block w-3 h-3 bg-green-500 align-baseline rounded-sm" />
    &nbsp;exhaust&nbsp;with&nbsp;arctic sea ice extend&nbsp;
    <span className="inline-block w-3 h-3 bg-blue-500 align-baseline rounded-sm" />
    &nbsp;and&nbsp;Arctic&nbsp;temperature&nbsp;
    <span className="inline-block w-3 h-3 bg-red-500 align-baseline rounded-sm" />
  </>
);

/* ------------- component ---------------------------------------- */
export default function ZScoreChartRecharts({
  data, inverted=false, apiRef
}:Props){
  const [inv, setInv] = useState(inverted);

  /* expose API for ChartScene actions ----------------------------- */
  useImperativeHandle(apiRef, ()=>({
    toggleInvert: (v:boolean)=> setInv(v)
  }));

  /* merge inverted column on-the-fly ----------------------------- */
  const plotted = useMemo(()=> data.map(r=>({
    ...r, SeaIceFinal: inv ? r.SeaIce_z_inv : r.SeaIce_z
  })),[data,inv]);

  /* legend hide/show state --------------------------------------- */
  const [hidden, setHidden] = useState<string[]>([]);

  /* ------------- render ----------------------------------------- */
  return(
    <div className="w-full">

      <div className="h-[400px] w-full">
         <div className="text-center font-semibold text-slate-800 mb-1 select-none text-sm sm:text-base">
        {HEADLINE}
      </div>
        <ResponsiveContainer>
          <LineChart data={plotted} margin={{top:20,right:20,bottom:20,left:0}}>
            <CartesianGrid className="chart-grid" strokeDasharray="3 3"/>
            <XAxis className="chart-axis" dataKey="Year"/>
            <YAxis className="chart-axis"/>
            <Tooltip formatter={v=>typeof v==="number"?v.toFixed(2):v}/>
            <Legend className="chart-grid"
                    onClick={o=>{
                      const k=o.dataKey as string;
                      setHidden(h=>h.includes(k) ? h.filter(x=>x!==k)
                                                 : [...h, k]);
                    }}/>
            <Line type="monotone" dataKey="Arctic_z"
                  name="Arctic Temp (z)" stroke="#ef4444"
                  hide={hidden.includes("Arctic_z")} dot={false}/>
            <Line type="monotone" dataKey="SeaIceFinal"
                  name={inv ? "Sea Ice (inv, z)" : "Sea Ice (z)"}
                  stroke="#3b82f6"
                  hide={hidden.includes("SeaIceFinal")} dot={false}/>
            <Line type="monotone" dataKey="GlobCO2Mean_z"
                  name="CO₂ (z)" stroke=" #48bb78"
                  hide={hidden.includes("GlobCO2Mean_z")} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
