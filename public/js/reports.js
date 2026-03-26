import { createClient } from
"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
"https://vuzgotyghqsyjdjrbuwu.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);

const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");

/* AUTH */

const { data:{ session } } = await supabase.auth.getSession();
if(!session) location.href="auth.html";

/* LOGOUT */

logoutBtn.onclick=e=>{
e.preventDefault();
logoutModal.classList.add("show");
};

cancelLogout.onclick=()=> logoutModal.classList.remove("show");

confirmLogout.onclick=async()=>{
await supabase.auth.signOut();
location.href="auth.html";
};

/* LOAD DATA */

async function loadReports(){

const {data,error}=await supabase
.from("device_readings")
.select("db, created_at")
.gte(
"created_at",
new Date(Date.now() - 30*24*60*60*1000).toISOString()
);

if(error){
alert("Error loading reports");
return;
}

buildDaily(data);
buildWeekly(data);
buildMonthly(data);

}

/* DAILY */

function buildDaily(data){

let map={};

data.forEach(r=>{
const d=new Date(r.created_at);
const key=d.toISOString().split("T")[0];

if(!map[key]) map[key]={sum:0,count:0};

map[key].sum+=Number(r.db);
map[key].count++;
});

const labels=Object.keys(map).slice(-7);
const values=labels.map(k=>(map[k].sum/map[k].count).toFixed(1));

new Chart(dailyChart,{
type:"line",
data:{
labels,
datasets:[{
label:"Avg dB",
data:values,
tension:.3
}]
}
});

}

/* WEEKLY */

function buildWeekly(data){

let map={};

data.forEach(r=>{
const d=new Date(r.created_at);

const first=new Date(d.getFullYear(),0,1);
const week=Math.ceil((((d-first)/86400000)+first.getDay()+1)/7);

const key="Week "+week;

if(!map[key]) map[key]={sum:0,count:0};

map[key].sum+=Number(r.db);
map[key].count++;
});

const labels=Object.keys(map).slice(-6);
const values=labels.map(k=>(map[k].sum/map[k].count).toFixed(1));

new Chart(weeklyChart,{
type:"bar",
data:{
labels,
datasets:[{
label:"Avg dB",
data:values
}]
}
});

}

/* MONTHLY */

function buildMonthly(data){

let map={};

data.forEach(r=>{
const d=new Date(r.created_at);

const key=d.getFullYear()+"-"+(d.getMonth()+1);

if(!map[key]) map[key]={sum:0,count:0};

map[key].sum+=Number(r.db);
map[key].count++;
});

const labels=Object.keys(map).slice(-6);
const values=labels.map(k=>(map[k].sum/map[k].count).toFixed(1));

new Chart(monthlyChart,{
type:"line",
data:{
labels,
datasets:[{
label:"Avg dB",
data:values,
tension:.3
}]
}
});

}

loadReports();