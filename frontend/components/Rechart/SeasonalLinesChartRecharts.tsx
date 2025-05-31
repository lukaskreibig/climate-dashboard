"use client";
import React, { useMemo } from "react";
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, XAxis, YAxis
} from "recharts";
import * as d3 from "d3";

interface Row   { Year:number; DayOfYear:number; Extent?:number|null; }
interface Props { data:Row[] }

export default function SeasonalLinesChartRecharts({ data }:Props) {
  const byYear = useMemo(() =>{
    const m=new Map<number,Row[]>(); data.forEach(r=>m.get(r.Year)?.push(r)??m.set(r.Year,[r]));
    m.forEach(a=>a.sort((a,b)=>a.DayOfYear-b.DayOfYear));
    return [...m].map(([year,values])=>({year,values})).sort((a,b)=>a.year-b.year);
  },[data]);
  if(!byYear.length) return null;

  const flat=data.filter(d=>d.Extent!=null) as Required<Row>[];
  const max = flat.reduce((a,b)=>b.Extent>a.Extent?b:a);
  const min = flat.reduce((a,b)=>b.Extent<a.Extent?b:a);
  const col = d3.scaleSequential(d3.interpolateTurbo)
                .domain([byYear[0].year,byYear.at(-1)!.year]);
  const [minE,maxE]=d3.extent(flat,d=>d.Extent)!;
  const month = (d:number)=>(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
                              [new Date(2001,0,d).getMonth()]);

  return(
    <div style={{width:"100%",height:400}}>
      <ResponsiveContainer>
        <LineChart margin={{top:20,right:20,bottom:40,left:20}}>
          <CartesianGrid  className="chart-grid"     strokeDasharray="3 3"/>
          <XAxis  className="chart-axis"
                 dataKey="DayOfYear" type="number" domain={[1,366]} tickCount={12}
                 tickFormatter={month} label={{value:"Month",position:"bottom"}}/>
          <YAxis  className="chart-axis"
                 domain={[minE,maxE]}
                 label={{value:"Extent (M km²)",angle:-90,position:"insideLeft",offset:-5}}/>
          <Legend className="chart-grid" wrapperStyle={{display:"none"}}/>
          {byYear.map(({year,values})=>
            <Line key={year} data={values} dataKey="Extent" stroke={col(year)} dot={false}/>
          )}
          <ReferenceLine className="chart-ref"
                         x={max.DayOfYear} stroke={col(max.Year)} strokeDasharray="3 3"
                         label={{position:"right",
                                 value:`Max ${max.Extent.toFixed(2)} M km² (${max.Year})`,
                                 fill:col(max.Year),fontSize:12}}/>
          <ReferenceLine className="chart-ref"
                         x={min.DayOfYear} stroke={col(min.Year)} strokeDasharray="3 3"
                         label={{position:"top",
                                 value:`Min ${min.Extent.toFixed(2)} M km² (${min.Year})`,
                                 fill:col(min.Year),fontSize:12}}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
