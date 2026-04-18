import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
"https://vuzgotyghqsyjdjrbuwu.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);

let currentDevice = null;

let thresholds = {
  normal: 50,
  moderate: 70,
  critical: 90
};

/* WAIT FOR REACT */
async function waitForGraph(){
return new Promise(resolve=>{
const check=setInterval(()=>{
if(window.updateNoiseGraph){
clearInterval(check);
resolve();
}
},100);
});
}

/* LOAD DEVICES */
async function loadDevices(){

const {data}=await supabase
.from("devices")
.select("*")
.order("device_name");

devicesBody.innerHTML="";

data.forEach((d,index)=>{

const tr=document.createElement("tr");

tr.innerHTML=`
<td>${d.device_name}</td>
<td>${d.location || "-"}</td>
`;

tr.onclick=()=>{
selectDevice(d.device_name,d.location,tr);
};

devicesBody.appendChild(tr);

if(index===0){
setTimeout(()=>selectDevice(d.device_name,d.location,tr),300);
}

});

}

/* SELECT DEVICE */
async function selectDevice(device,location,row){

document.querySelectorAll("#devicesBody tr")
.forEach(r=>r.classList.remove("selected"));

row.classList.add("selected");

currentDevice=device;

document.getElementById("deviceName").innerText="Device: "+device;
document.getElementById("deviceLocation").innerText="Location: "+location;

// 🔥 LOAD THRESHOLD FIRST
await loadThreshold(device);

checkDeviceOnline();
loadLatest();

}

/* ONLINE CHECK */
async function checkDeviceOnline(){

const {data}=await supabase
.from("device_readings")
.select("created_at")
.eq("device_name",currentDevice)
.order("id",{ascending:false})
.limit(1)
.single();

if(!data){
setOffline();
return;
}

const last=new Date(data.created_at).getTime();
const now=Date.now();

if((now-last)/1000 >1){
setOffline();
}else{
setOnline();
}

}

function setOnline(){
const status=document.getElementById("deviceStatus");
status.innerText="ONLINE";
status.classList.remove("offline");
status.classList.add("online");
}

function setOffline(){
const status=document.getElementById("deviceStatus");
status.innerText="OFFLINE";
status.classList.remove("online");
status.classList.add("offline");
}

/* LOAD HISTORY */
async function loadLatest(){

if(window.clearGraph){
window.clearGraph();
}

const {data}=await supabase
.from("device_readings")
.select("*")
.eq("device_name",currentDevice)
.order("id",{ascending:false})
.limit(20);

if(!data) return;

data.reverse().forEach((row,i)=>{
setTimeout(()=>{
applyRow(row,true);
},i*40);
});

}

/* APPLY ROW */
function applyRow(row,isHistory=false){

if(row.device_name!==currentDevice) return;

const noise=Number(row.db || 0);

document.getElementById("noiseValue").innerText=noise.toFixed(1);

const bar = document.getElementById("liveBarFill");
const value = document.getElementById("noiseValue"); // 👈 ADD THIS

bar.style.width = Math.min(noise,100) + "%";

// 👉 define color once
let color = "#22c55e";

if(noise <= thresholds.normal){
  color = "#22c55e"; // GREEN
}
else if(noise <= thresholds.moderate){
  color = "#eab308"; // YELLOW
}
else{
  color = "#ef4444"; // RED
}

// ✅ apply to bar
bar.style.background = color;

// ✅ apply to number (ETO ANG KULANG MO)
value.style.color = color;


if(window.updateNoiseGraph){
window.updateNoiseGraph(noise, isHistory ? "history" : "live");
}

}

/* REALTIME */
supabase.channel("viewer")
.on("postgres_changes",
{event:"INSERT",schema:"public",table:"device_readings"},
payload=>{
applyRow(payload.new,false);
})
.subscribe();

/* CHECK STATUS EVERY SECOND */
setInterval(()=>{
if(currentDevice){
checkDeviceOnline();
}
},1000);

/* START */
await waitForGraph();
loadDevices();

async function loadThreshold(device){

const {data} = await supabase
.from("device_thresholds") // ✅ tama na table name
.select("*")
.eq("device_name", device)
.single();

if(data){
thresholds.normal = data.normal;
thresholds.moderate = data.moderate;
thresholds.critical = data.critical;
}else{
thresholds = {
  normal: 50,
  moderate: 70,
  critical: 90
};
}

}