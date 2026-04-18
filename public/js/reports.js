import { createClient } from
"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
"https://vuzgotyghqsyjdjrbuwu.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);

let chart;

const deviceFilter = document.getElementById("deviceFilter");
const rangeFilter = document.getElementById("rangeFilter");

const avgNoise = document.getElementById("avgNoise");
const peakNoise = document.getElementById("peakNoise");
const totalRecords = document.getElementById("totalRecords");

/* LOAD DEVICES */
async function loadDevices(){
const { data } = await supabase.from("devices").select("device_name");

data.forEach(d=>{
const opt = document.createElement("option");
opt.value = d.device_name;
opt.textContent = d.device_name;
deviceFilter.appendChild(opt);
});
}

/* LOAD REPORTS */
async function loadReports(){

const now = new Date();
let fromDate;

if(rangeFilter.value==="daily"){
fromDate = new Date(now - 24*60*60*1000);
}
else if(rangeFilter.value==="weekly"){
fromDate = new Date(now - 7*24*60*60*1000);
}
else{
fromDate = new Date(now - 30*24*60*60*1000);
}

let query = supabase
.from("device_readings")
.select("db, created_at, device_name")
.gte("created_at", fromDate.toISOString())
.limit(5000);

if(deviceFilter.value !== "all"){
query = query.eq("device_name", deviceFilter.value);
}

const { data, error } = await query;

if(error){
console.log(error);
alert("Error loading data");
return;
}

updateSummary(data);
buildChart(data);

}

/* SUMMARY */
function updateSummary(data){

if(data.length===0){
avgNoise.innerText="0 dB";
peakNoise.innerText="0 dB";
totalRecords.innerText="0";
return;
}

const values = data.map(d=>Number(d.db));

const avg = (values.reduce((a,b)=>a+b,0)/values.length).toFixed(2);
const peak = Math.max(...values).toFixed(2);

avgNoise.innerText = avg+" dB";
peakNoise.innerText = peak+" dB";
totalRecords.innerText = data.length;

}

/* GRAPH */
function buildChart(data){

let map = {};
const mode = rangeFilter.value;

data.forEach(r=>{
const d = new Date(r.created_at);

let key;

if(mode==="daily"){
key = d.getHours()+":00";
}
else if(mode==="weekly"){
key = d.toLocaleDateString();
}
else{
key = d.getFullYear()+"-"+(d.getMonth()+1);
}

if(!map[key]) map[key]={sum:0,count:0};

map[key].sum += Number(r.db);
map[key].count++;
});

/* SORT */
const labels = Object.keys(map).sort();
const values = labels.map(k=>(map[k].sum/map[k].count).toFixed(1));

if(chart) chart.destroy();

/* 🎨 BEAUTIFUL GRAPH */
chart = new Chart(document.getElementById("mainChart"),{
type: mode==="weekly" ? "bar":"line",
data:{
labels,
datasets:[{
label:"Average dB",
data:values,
borderWidth:3,
tension:.4,
pointRadius:4,
fill:true,
backgroundColor:"rgba(59,130,246,0.15)",
borderColor:"#3b82f6"
}]
},
options:{
responsive:true,
plugins:{
legend:{
display:true,
labels:{
color:"#334155",
font:{size:13}
}
}
},
scales:{
x:{
grid:{display:false}
},
y:{
beginAtZero:true,
grid:{
color:"rgba(0,0,0,0.05)"
}
}
}
}
});

}

/* EVENTS */
deviceFilter.onchange = loadReports;
rangeFilter.onchange = loadReports;

/* AUTO REFRESH */
setInterval(loadReports,10000);

/* INIT */
loadDevices();
loadReports();