import { useEffect, useState } from "react"
import {
ResponsiveContainer,
AreaChart,
Area,
CartesianGrid,
XAxis,
YAxis,
Tooltip,
BarChart,
Bar,
LineChart,
Line,
Legend
} from "recharts"

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
"https://vuzgotyghqsyjdjrbuwu.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
)

export default function Reports(){

const [daily,setDaily] = useState([])
const [weekly,setWeekly] = useState([])
const [monthly,setMonthly] = useState([])

const [stats,setStats] = useState({
avg:0,
max:0,
records:0
})

useEffect(()=>{
loadReports()
},[])

async function loadReports(){

const { data, error } = await supabase
.from("device_readings")
.select("*")
.order("created_at",{ ascending:true })

if(error){
console.log(error)
return
}

const byDay = {}
const byWeek = {}
const byMonth = []

let total = 0
let max = 0

data.forEach(row=>{

const val = Number(row.db)
if(isNaN(val)) return

total += val
if(val > max) max = val

const d = new Date(row.created_at)

const dayKey =
d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()

const weekKey =
d.getFullYear()+"-W"+getWeekNumber(d)

const monthKey =
d.getFullYear()+"-"+(d.getMonth()+1)

if(!byDay[dayKey]) byDay[dayKey]=[]
if(!byWeek[weekKey]) byWeek[weekKey]=[]

byDay[dayKey].push(val)
byWeek[weekKey].push(val)

byMonth.push({
time: d.toLocaleTimeString(),
value: val
})

})

setStats({
avg: (total/data.length).toFixed(2),
max: max.toFixed(2),
records: data.length
})

setDaily(
Object.keys(byDay).map(k=>({
date:k,
avg: avg(byDay[k])
}))
)

setWeekly(
Object.keys(byWeek).map(k=>({
week:k,
avg: avg(byWeek[k])
}))
)

setMonthly(byMonth)

}

function avg(arr){
if(arr.length===0) return 0
return Number(
arr.reduce((a,b)=>a+b,0)/arr.length
).toFixed(2)
}

function getWeekNumber(date){
const firstJan = new Date(date.getFullYear(),0,1)
const days = Math.floor((date-firstJan)/86400000)
return Math.ceil((days + firstJan.getDay()+1)/7)
}

return(

<div style={{display:"grid",gap:"40px"}}>

{/* ===== SUMMARY CARDS ===== */}

<div style={{
display:"grid",
gridTemplateColumns:"repeat(3,1fr)",
gap:"20px"
}}>

<div className="report-card">
<h4>Average Noise</h4>
<h2>{stats.avg} dB</h2>
</div>

<div className="report-card">
<h4>Peak Noise</h4>
<h2>{stats.max} dB</h2>
</div>

<div className="report-card">
<h4>Total Records</h4>
<h2>{stats.records}</h2>
</div>

</div>

{/* ===== DAILY AREA ===== */}

<div className="report-card">
<h3>Daily Noise Average</h3>

<ResponsiveContainer width="100%" height={300}>
<AreaChart data={daily}>
<defs>
<linearGradient id="colorNoise" x1="0" y1="0" x2="0" y2="1">
<stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
<stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
</linearGradient>
</defs>

<CartesianGrid strokeDasharray="3 3"/>
<XAxis dataKey="date"/>
<YAxis/>
<Tooltip/>
<Legend/>

<Area
type="monotone"
dataKey="avg"
stroke="#6366f1"
strokeWidth={3}
fill="url(#colorNoise)"
animationDuration={1200}
/>

</AreaChart>
</ResponsiveContainer>

</div>

{/* ===== WEEKLY BAR ===== */}

<div className="report-card">
<h3>Weekly Noise Average</h3>

<ResponsiveContainer width="100%" height={300}>
<BarChart data={weekly}>
<CartesianGrid strokeDasharray="3 3"/>
<XAxis dataKey="week"/>
<YAxis/>
<Tooltip/>
<Legend/>

<Bar
dataKey="avg"
fill="#22c55e"
radius={[12,12,0,0]}
animationDuration={1500}
/>

</BarChart>
</ResponsiveContainer>

</div>

{/* ===== LIVE TREND LINE ===== */}

<div className="report-card">
<h3>Noise Trend (Live Sequence)</h3>

<ResponsiveContainer width="100%" height={300}>
<LineChart data={monthly}>
<CartesianGrid strokeDasharray="3 3"/>
<XAxis dataKey="time"/>
<YAxis/>
<Tooltip/>
<Legend/>

<Line
type="monotone"
dataKey="value"
stroke="#f59e0b"
strokeWidth={3}
dot={false}
animationDuration={1500}
/>

</LineChart>
</ResponsiveContainer>

</div>

</div>
)

}