import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
"https://vuzgotyghqsyjdjrbuwu.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);


const { data: { user } } = await supabase.auth.getUser();
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
if(!user){
  location.href = "auth.html";
}

let currentDevice=null;
let currentLocation="-";

let thresholds = {
  normal: 50,
  moderate: 70,
  critical: 90
};

const deleteModal = document.getElementById("deleteModal");
const editModal = document.getElementById("editModal");

const deleteDeviceName = document.getElementById("deleteDeviceName");
const editDeviceLabel = document.getElementById("editDeviceLabel");
const editLocationInput = document.getElementById("editLocationInput");

const confirmDelete = document.getElementById("confirmDelete");
const cancelDelete = document.getElementById("cancelDelete");

const confirmEdit = document.getElementById("confirmEdit");
const cancelEdit = document.getElementById("cancelEdit");

const logoutModal = document.getElementById("logoutModal");
const logoutBtn = document.getElementById("logoutBtn");

const confirmLogout = document.getElementById("confirmLogout");
const cancelLogout = document.getElementById("cancelLogout");

let selectedId = null;
let selectedDeviceName = null;

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

async function loadThresholds(){

const {data} = await supabase
.from("device_thresholds")
.select("*")
.eq("device_name", currentDevice)
.single();

if(data){
  thresholds.normal = data.normal;
  thresholds.moderate = data.moderate;
  thresholds.critical = data.critical;
}

}
async function selectDevice(device, location, row) {

  document.querySelectorAll("#devicesBody tr")
    .forEach(r => r.classList.remove("selected"));

  row.classList.add("selected");

  currentDevice = device;
  currentLocation = location || "-";

  await loadThresholds();

  if (window.setThresholds) {
    window.setThresholds(thresholds);
  }

  checkDeviceOnline();

  // 🔥 WAIT FOR GRAPH AGAIN
  await waitForGraph();

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

if((now-last)/1000 >1){
setOffline();
}else{
setOnline();
}

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
  }, i * 40);
});

}
function applyRow(row, isHistory = false) {

  if (!window.updateNoiseGraph) return;
  if (row.device_name !== currentDevice) return;

  const noise = Number(row.db || 0);

  avgNoise.innerText = noise.toFixed(1) + " dB";

  window.updateNoiseGraph(
    noise,
    isHistory ? "history" : "live"
  );
}

/* REALTIME */

supabase.channel("rt")
.on("postgres_changes",
{event:"INSERT",schema:"public",table:"device_readings"},
payload => {
  console.log("Realtime:", payload.new); // 🔥 debug
  applyRow(payload.new, false);
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

devicesBody.onclick = e => {

const id = e.target.dataset.id;

if(e.target.classList.contains("btn-delete")){
e.stopPropagation();

selectedId = Number(id);
selectedDeviceName = e.target.closest("tr").children[0].innerText;

deleteDeviceName.innerText = selectedDeviceName;

// OPEN MODAL
deleteModal.classList.add("show");
}

if(e.target.classList.contains("btn-edit")){
e.stopPropagation();

selectedId = id;
selectedDeviceName = e.target.closest("tr").children[0].innerText;
const currentLoc = e.target.closest("tr").children[1].innerText;

editDeviceLabel.innerText = "Editing " + selectedDeviceName;
editLocationInput.value = currentLoc === "-" ? "" : currentLoc;

// OPEN MODAL
editModal.classList.add("show");
}
};

confirmDelete.onclick = async () => {
  await supabase.from("devices").delete().eq("id", Number(selectedId));
  deleteModal.classList.remove("show");
  loadDevices();
};

cancelDelete.onclick = () => {
  deleteModal.classList.remove("show");
};

confirmEdit.onclick = async () => {

const newLoc = editLocationInput.value.trim();

if(!newLoc){
alert("Location required!");
return;
}

console.log("ID:", selectedId);
console.log("NEW LOCATION:", newLoc);

const { data, error } = await supabase
.from("devices")
.update({ location: newLoc })
.eq("id", selectedId)
.select();

if(error){
console.error("UPDATE ERROR:", error);
alert("Update failed!");
return;
}

console.log("UPDATED:", data);

editModal.classList.remove("show");
loadDevices();

};

cancelEdit.onclick = () => {
  editModal.classList.remove("show");
};
logoutBtn.onclick = (e) => {
  e.preventDefault();
  logoutModal.classList.add("show");
};
cancelLogout.onclick = () => {
  logoutModal.classList.remove("show");
};


confirmLogout.onclick = async () => {

const { error } = await supabase.auth.signOut();

if(error){
  console.error(error);
  alert("Logout failed");
  return;
}

location.href = "auth.html";

}
window.onclick = (e) => {
  if(e.target.classList.contains("modal-overlay")){
    e.target.classList.remove("show");
  }
};


waitForGraph().then(() => {
  loadDevices();
});

setInterval(()=>{
if(currentDevice){
checkDeviceOnline();
}
},1000);