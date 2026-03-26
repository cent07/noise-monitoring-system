import { useEffect, useState } from "react";
import {
ResponsiveContainer,
AreaChart,
Area,
XAxis,
YAxis,
Tooltip,
CartesianGrid,
BarChart,
Bar,
LineChart,
Line
} from "recharts";

import dayjs from "dayjs";
import { supabase } from "./supabase";
import "./App.css";

export default function App() {

const [daily,setDaily] = useState([]);
const [weekly,setWeekly] = useState([]);
const [monthly,setMonthly] = useState([]);
const [loading,setLoading] = useState(true);

useEffect(()=>{
loadReports();
},[]);

async function loadReports(){

const { data, error } = await supabase
.from("device_readings")
.select("*")
.order("created_at",{ascending:true});

if(error){
console.log(error);
return;
}

const dailyMap = {};
const weeklyMap = {};
const monthlyMap = {};

data.forEach(row=>{

const value = row.noise_level; // ⭐ CHANGE if column different
const date = dayjs(row.created_at);

const dayKey = date.format("YYYY-MM-DD");
const weekKey = date.week();
const monthKey = date.format("YYYY-MM");

if(!dailyMap[dayKey]) dailyMap[dayKey] = [];
if(!weeklyMap[weekKey]) weeklyMap[weekKey] = [];
if(!monthlyMap[monthKey]) monthlyMap[monthKey] = [];

dailyMap[dayKey].push(value);
weeklyMap[weekKey].push(value);
monthlyMap[monthKey].push(value);

});

const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;

setDaily(
Object.keys(dailyMap).map(k=>({
date:k,
avg:avg(dailyMap[k]).toFixed(2)
}))
);

setWeekly(
Object.keys(weeklyMap).map(k=>({
week:k,
avg:avg(weeklyMap[k]).toFixed(2)
}))
);

setMonthly(
Object.keys(monthlyMap).map(k=>({
month:k,
avg:avg(monthlyMap[k]).toFixed(2)
}))
);

setLoading(false);

}

if(loading) return <div className="loading">Loading Reports...</div>;

return (
<div className="reports-wrapper">

{/* DAILY */}
<div className="report-card">
<h3>Daily Noise Trend</h3>

<ResponsiveContainer width="100%" height={260}>
<AreaChart data={daily}>
<defs>
<linearGradient id="colorNoise" x1="0" y1="0" x2="0" y2="1">
<stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
<stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
</linearGradient>
</defs>

<CartesianGrid strokeDasharray="3 3" />
<XAxis dataKey="date"/>
<YAxis/>
<Tooltip/>

<Area
type="monotone"
dataKey="avg"
stroke="#4f46e5"
fillOpacity={1}
fill="url(#colorNoise)"
strokeWidth={3}
/>

</AreaChart>
</ResponsiveContainer>
</div>

{/* WEEKLY */}
<div className="report-card">
<h3>Weekly Average</h3>

<ResponsiveContainer width="100%" height={260}>
<BarChart data={weekly}>
<CartesianGrid strokeDasharray="3 3"/>
<XAxis dataKey="week"/>
<YAxis/>
<Tooltip/>

<Bar
dataKey="avg"
fill="#22c55e"
radius={[8,8,0,0]}
/>

</BarChart>
</ResponsiveContainer>
</div>

{/* MONTHLY */}
<div className="report-card">
<h3>Monthly Noise Trend</h3>

<ResponsiveContainer width="100%" height={260}>
<LineChart data={monthly}>
<CartesianGrid strokeDasharray="3 3"/>
<XAxis dataKey="month"/>
<YAxis/>
<Tooltip/>

<Line
type="monotone"
dataKey="avg"
stroke="#f97316"
strokeWidth={4}
dot={{r:6}}
/>

</LineChart>
</ResponsiveContainer>
</div>

</div>
);
}