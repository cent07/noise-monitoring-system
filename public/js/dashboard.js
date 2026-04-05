import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
"https://vuzgotyghqsyjdjrbuwu.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);

const { data:{ session } } = await supabase.auth.getSession();
if(!session) location.href="auth.html";


let currentDevice=null;
let currentLocation="-";


/* LOAD DEVICES */

async function loadDevices(){

const {data}=await supabase
.from("devices")
.select("*")
.order("device_name");

totalDevices.innerText=data.length;
devicesBody.innerHTML="";

data.forEach((d,index)=>{

const tr=document.createElement("tr");

tr.innerHTML=`
<td>${d.device_name}</td>
<td>${d.location || "-"}</td>
<td>
<button class="btn-action btn-edit" data-id="${d.id}">Edit</button>
<button class="btn-action btn-delete" data-id="${d.id}">Delete</button>
</td>
`;

tr.onclick=e=>{
if(e.target.tagName==="BUTTON") return;

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
currentLocation=location || "-";

checkDeviceOnline();   // ⭐ CHECK REAL STATUS
loadLatest();

}


/* CHECK ONLINE STATUS FROM DB */

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

if((now-last)/1000 > 3){
setOffline();
}else{
setOnline();
}

}


/* LOAD HISTORY */

async function loadLatest(){

const {data}=await supabase
.from("device_readings")
.select("*")
.eq("device_name",currentDevice)
.order("id",{ascending:false})
.limit(20);

if(!data) return;

data.reverse().forEach(row=>{
applyRow(row,true);
});

}


/* APPLY ROW */

function applyRow(row,isHistory=false){

if(row.device_name!==currentDevice) return;

const noise=Number(row.db || 0);
const status=row.status || "-";

/* UPDATE UI */
avgNoise.innerText=noise.toFixed(1)+" dB";
activeAlerts.innerText=status==="CRITICAL"?1:0;

/* UPDATE GRAPH */
if(window.updateNoiseGraph){

// 👉 history = bulk load
if(isHistory){
window.updateNoiseGraph(noise, "history");
}

// 👉 realtime = live update
else{
window.updateNoiseGraph(noise, "live");
}

}

}


/* REALTIME */

supabase.channel("rt")
.on("postgres_changes",
{event:"INSERT",schema:"public",table:"device_readings"},
payload=>{
applyRow(payload.new,false);
})
.subscribe();


/* ONLINE OFFLINE UI */

function setOnline(){
if(window.setDeviceStatus){
window.setDeviceStatus("ONLINE",currentDevice,currentLocation);
}
}

function setOffline(){
if(window.setDeviceStatus){
window.setDeviceStatus("OFFLINE",currentDevice,currentLocation);
}
}


/* EVENT DELEGATION FOR EDIT DELETE */

devicesBody.onclick = async e => {

const id = e.target.dataset.id;

if(e.target.classList.contains("btn-delete")){
e.stopPropagation();

if(confirm("Delete device?")){
await supabase.from("devices").delete().eq("id",id);
loadDevices();
}
}

if(e.target.classList.contains("btn-edit")){
e.stopPropagation();

const loc = prompt("New location:");
if(!loc) return;

await supabase.from("devices")
.update({location:loc})
.eq("id",id);

loadDevices();
}

};


/* START */

loadDevices();

setInterval(()=>{
if(currentDevice){
checkDeviceOnline();
}
},1000);