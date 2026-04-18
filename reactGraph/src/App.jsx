import { useEffect, useState } from "react";
import {
ResponsiveContainer,
AreaChart,
Area,
XAxis,
YAxis,
Tooltip,
CartesianGrid
} from "recharts";

function App(){

const [data,setData]=useState([]);
const [status,setStatus]=useState("OFFLINE");
const [device,setDevice]=useState("-");
const [location,setLocation]=useState("-");

// ✅ NEW: dynamic thresholds
const [thresholds, setThresholds] = useState({
  normal: 50,
  moderate: 70,
  critical: 90
});

useEffect(()=>{

window.updateNoiseGraph=(noise,isHistory=false)=>{

const time=new Date().toLocaleTimeString();

setData(prev => {
  const updated = prev.slice(-29);
  return [...updated, { noise: Number(noise), time }];
});

};

window.resetNoiseGraph=()=>setData([]);

window.setDeviceStatus=(s,d,loc)=>{
setStatus(s);
setDevice(d || "-");
setLocation(loc || "-");
};

// ✅ RECEIVE thresholds from dashboard.js
window.setThresholds = (t) => {
  setThresholds(t);
};

},[]);

const latestNoise=data.length?data[data.length-1].noise:0;

// ✅ COLOR LOGIC (DYNAMIC)
const color =
latestNoise <= thresholds.normal ? "#22c55e" :
latestNoise <= thresholds.moderate ? "#f59e0b" :
"#ef4444";

return(

<div style={{
width:"100%",
height:"100%",
display:"grid",
gridTemplateColumns:"260px 1fr",
gap:"18px",
fontFamily:"Inter"
}}>

{/* LIVE PANEL */}
<div style={{
background:"#0f172a",
color:"#fff",
borderRadius:"14px",
padding:"20px",
display:"flex",
flexDirection:"column",
justifyContent:"space-between"
}}>

<div>

<h4 style={{opacity:.7}}>LIVE NOISE</h4>

<h1 style={{
fontSize:"64px",
margin:"10px 0",
color: color // ✅ dynamic text color
}}>
{latestNoise?latestNoise.toFixed(1):"--"}
</h1>

{/* BAR */}
<div style={{
height:"8px",
background:"#1e293b",
borderRadius:"8px",
overflow:"hidden",
marginTop:"14px"
}}>
<div style={{
width:`${Math.min(latestNoise,100)}%`,
height:"100%",
background: color, // ✅ dynamic bar color
transition:"0.4s"
}}/>
</div>

{/* DEVICE INFO */}
<div style={{marginTop:"22px",fontSize:"13px",opacity:.9}}>
Device: <b>{device}</b>
</div>

<div style={{marginTop:"4px",fontSize:"13px",opacity:.9}}>
Location: <b>{location}</b>
</div>

{/* STATUS BADGE */}
<div style={{
marginTop:"10px",
display:"inline-block",
padding:"6px 16px",
borderRadius:"20px",
fontSize:"12px",
fontWeight:"700",
background:status==="ONLINE"?"#22c55e":"#64748b"
}}>
{status}
</div>

</div>

<div style={{fontSize:"12px",opacity:.6}}>
Realtime Monitoring
</div>

</div>


{/* GRAPH */}
<div style={{
background:"#ffffff",
borderRadius:"14px",
padding:"0px",
boxShadow:"0 10px 30px rgba(0,0,0,0.05)"
}}>

<ResponsiveContainer width="100%" height={340}>
<AreaChart data={data} margin={{top:10,right:0,left:0,bottom:0}}>

<defs>
<linearGradient id="noiseFill" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stopColor="#6366f1" stopOpacity={0.35}/>
<stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
</linearGradient>
</defs>

<CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false}/>

<XAxis 
  dataKey="time"
  interval="preserveStartEnd"
  minTickGap={20}
  tick={{fill:"#64748b",fontSize:12}}
  axisLine={false}
  tickLine={false}
/>

<YAxis domain={[20,120]} tick={{fill:"#64748b",fontSize:12}} axisLine={false} tickLine={false}/>

<Tooltip 
  formatter={(value) => [`${value} dB`, "Noise"]}
  labelFormatter={(label) => `Time: ${label}`}
  contentStyle={{
    borderRadius:"10px",
    border:"none",
    boxShadow:"0 10px 25px rgba(0,0,0,0.08)"
  }}
/>

<Area
type="monotone"
dataKey="noise"
stroke="#6366f1"
strokeWidth={3}
fill="url(#noiseFill)"
dot={false}
isAnimationActive={false}
connectNulls={true}
/>

</AreaChart>
</ResponsiveContainer>

</div>

</div>

);

}

export default App;