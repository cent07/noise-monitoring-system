import { createClient } from
"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
"https://vuzgotyghqsyjdjrbuwu.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);
// ===== LOGOUT MODAL =====
document.addEventListener("DOMContentLoaded", () => {

  const logoutBtn = document.getElementById("logoutBtn");
  const logoutModal = document.getElementById("logoutModal");
  const cancelLogout = document.getElementById("cancelLogout");
  const confirmLogout = document.getElementById("confirmLogout");

  if(!logoutBtn) return;

  // OPEN
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    logoutModal.classList.add("show");
  });

  // CANCEL
  cancelLogout.addEventListener("click", () => {
    logoutModal.classList.remove("show");
  });

  // CLICK OUTSIDE
  logoutModal.addEventListener("click", (e) => {
    if(e.target === logoutModal){
      logoutModal.classList.remove("show");
    }
  });

  // CONFIRM LOGOUT
  confirmLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "auth.html";
  });

});
const deviceFilter = document.getElementById("deviceFilter");
const rangeFilter = document.getElementById("rangeFilter");

const avgNoise = document.getElementById("avgNoise");
const peakNoise = document.getElementById("peakNoise");
const totalRecords = document.getElementById("totalRecords");

async function loadDevices(){
  const { data } = await supabase.from("devices").select("device_name");

  deviceFilter.innerHTML = `<option value="all">All Devices</option>`;

  data.forEach(d=>{
    const opt = document.createElement("option");
    opt.value = d.device_name;
    opt.textContent = d.device_name;
    deviceFilter.appendChild(opt);
  });
}

async function loadReports(){

  const loading = document.getElementById("loadingState");
  const empty = document.getElementById("emptyState");

  loading.style.display = "block";
  empty.style.display = "none";

  let table, timeColumn;

  if(rangeFilter.value === "daily"){
    table = "device_readings_daily";
    timeColumn = "day";
  }
  else if(rangeFilter.value === "weekly"){
    table = "device_readings_weekly";
    timeColumn = "week_start";
  }
  else{
    table = "device_readings_monthly";
    timeColumn = "month";
  }

  let query = supabase
    .from(table)
    .select("*")
    .order(timeColumn, { ascending: true });

  if(deviceFilter.value !== "all"){
    query = query.eq("device_name", deviceFilter.value);
  }

  const { data, error } = await query;

  loading.style.display = "none";

  if(error){
    console.log(error);
    return;
  }

  if(!data || data.length === 0){
    empty.style.display = "block";
    return;
  }

  // SUMMARY
  const avg = data.reduce((s,d)=>s+Number(d.avg_db),0)/data.length;
  const peak = Math.max(...data.map(d=>Number(d.peak_db)));

  avgNoise.innerText = avg.toFixed(2) + " dB";
  peakNoise.innerText = peak.toFixed(2) + " dB";
  totalRecords.innerText = data.length;

  // FORMAT FOR REACT
  const formatted = data.map(d=>{

    const date = new Date(d.day || d.week_start || d.month);

    let label;

    if(rangeFilter.value === "daily"){
      label = date.toLocaleDateString();
    }
    else if(rangeFilter.value === "weekly"){
      const end = new Date(date);
      end.setDate(date.getDate()+6);
      label = date.toLocaleDateString() + " - " + end.toLocaleDateString();
    }
    else{
      label = date.toLocaleString('default',{month:'short'});
    }

    return {
      label,
      avg: Number(d.avg_db),
      peak: Number(d.peak_db)
    };
  });

  console.log("SEND TO REACT:", formatted);

  if(window.renderReportsGraph){
    window.renderReportsGraph(formatted);
  }
}

deviceFilter.onchange = loadReports;
rangeFilter.onchange = loadReports;

loadDevices();
loadReports();