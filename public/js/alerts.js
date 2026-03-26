import { createClient } from
"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
"https://vuzgotyghqsyjdjrbuwu.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);

/* AUTH */

const { data:{ session } } = await supabase.auth.getSession();
if(!session) location.href="auth.html";

/* ELEMENTS */

const filterDevice = document.getElementById("filterDevice");
const searchBox = document.getElementById("searchBox");
const filterDate = document.getElementById("filterDate");

const container = document.getElementById("alertsContainer");

const totalAlerts = document.getElementById("totalAlerts");
const latestDevice = document.getElementById("latestDevice");
const highestDb = document.getElementById("highestDb");

/* MODALS */

const alertModal = document.getElementById("alertModal");
const closeModal = document.getElementById("closeModal");

const logoutModal = document.getElementById("logoutModal");
const logoutBtn = document.getElementById("logoutBtn");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");

/* MODAL TEXT */

const mTitle = document.getElementById("mTitle");
const mLocation = document.getElementById("mLocation");
const mStatus = document.getElementById("mStatus");
const mTime = document.getElementById("mTime");

let masterData = [];

/* CLOSE ALERT MODAL */

closeModal.onclick = ()=> alertModal.classList.remove("show");

alertModal.onclick = (e)=>{
if(e.target === alertModal){
alertModal.classList.remove("show");
}
};

/* LOGOUT */

logoutBtn.onclick = (e)=>{
e.preventDefault();
logoutModal.classList.add("show");
};

cancelLogout.onclick = ()=>{
logoutModal.classList.remove("show");
};

confirmLogout.onclick = async()=>{
await supabase.auth.signOut();
location.href="auth.html";
};

/* LOAD DEVICES */

async function loadDevices(){

const {data} = await supabase
.from("devices")
.select("device_name")
.order("device_name");

filterDevice.innerHTML =
`<option value="">All Devices</option>`;

data.forEach(d=>{
filterDevice.innerHTML +=
`<option value="${d.device_name}">
${d.device_name}
</option>`;
});

}

/* FILTER + STATS */

function applyFilters(){

let list = [...masterData];

const dev = filterDevice.value;
const search = searchBox.value.toLowerCase();
const date = filterDate.value;

/* DEVICE */

if(dev){
list = list.filter(a=>a.device_name === dev);
}

/* SEARCH */

if(search){
list = list.filter(a =>
(a.device_name||"").toLowerCase().includes(search) ||
(a.location||"").toLowerCase().includes(search)
);
}

/* ⭐ DATE FILTER */

if(date){
list = list.filter(a=>{
const d = new Date(a.created_at);
const iso = d.toISOString().split("T")[0];
return iso === date;
});
}

/* STATS */

totalAlerts.innerText = list.length;

if(list.length){

latestDevice.innerText = list[0].device_name;

const max = Math.max(...list.map(a=>Number(a.db||0)));
highestDb.innerText = max.toFixed(1) + " dB";

}else{

latestDevice.innerText = "-";
highestDb.innerText = "0";

}

render(list);

}

/* RENDER */

function render(list){

container.innerHTML = "";

if(!list.length){
container.innerHTML =
"<p style='text-align:center'>No alerts found</p>";
return;
}

list.forEach(a=>{

const time = new Date(a.created_at);

const card = document.createElement("div");
card.className = "alert-card";

card.innerHTML = `
<div class="alert-left">
<div class="alert-title">
${a.device_name} — ${Number(a.db).toFixed(1)} dB
</div>
<div class="alert-sub">
${a.location || "-"} • Critical
</div>
</div>

<div class="alert-time">
${time.toLocaleTimeString()}
</div>
`;

card.onclick = ()=>{

mTitle.innerText =
`${a.device_name} — ${Number(a.db).toFixed(1)} dB`;

mLocation.innerText = a.location || "-";
mStatus.innerText = "CRITICAL";
mTime.innerText = time.toLocaleString();

alertModal.classList.add("show");

};

container.appendChild(card);

});

}

/* LOAD ALERTS */

async function loadAlerts(){

const {data,error} = await supabase
.from("device_alerts")
.select("*")
.order("created_at",{ascending:false});

if(error){
container.innerHTML =
"<p>Error loading alerts</p>";
return;
}

masterData = data;
applyFilters();

}

/* REALTIME */

supabase.channel("alerts")
.on(
"postgres_changes",
{event:"INSERT",schema:"public",table:"device_alerts"},
()=> loadAlerts()
)
.subscribe();

/* EVENTS */

filterDevice.onchange = applyFilters;
searchBox.oninput = applyFilters;
filterDate.onchange = applyFilters;

/* START */

loadDevices();
loadAlerts();