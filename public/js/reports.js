import { createClient } from
"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
"https://vuzgotyghqsyjdjrbuwu.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);

let chart;
let reportData = [];

const deviceFilter = document.getElementById("deviceFilter");
const rangeFilter = document.getElementById("rangeFilter");

const avgNoise = document.getElementById("avgNoise");
const peakNoise = document.getElementById("peakNoise");
const totalRecords = document.getElementById("totalRecords");

/* ================= LOAD DEVICES ================= */
async function loadDevices(){
  const { data } = await supabase.from("devices").select("device_name");

  data.forEach(d=>{
    const opt = document.createElement("option");
    opt.value = d.device_name;
    opt.textContent = d.device_name;
    deviceFilter.appendChild(opt);
  });
}

/* ================= LOAD REPORT ================= */
async function loadReports(){

  const now = new Date();
  let fromDate;
  let table;

  if(rangeFilter.value==="daily"){
    fromDate = new Date(now - 7*24*60*60*1000); // last 7 days
    table = "device_readings_daily";
  }
  else if(rangeFilter.value==="weekly"){
    fromDate = new Date(now - 30*24*60*60*1000); // last month
    table = "device_readings_weekly";
  }
  else{
    fromDate = new Date(now.getFullYear(), now.getMonth()-5, 1); // last 6 months
    table = "device_readings_monthly";
  }

  let query = supabase
  .from(table)
  .select("device_name, time, avg_db, peak_db")
  .gte("time", fromDate.toISOString())
  .order("time", { ascending: true });

  if(deviceFilter.value !== "all"){
    query = query.eq("device_name", deviceFilter.value);
  }

  const { data, error } = await query;

  if(error){
    console.log(error);
    alert("Error loading reports");
    return;
  }

  reportData = data;

  updateSummary(reportData);
  buildChart(reportData);
}

/* ================= SUMMARY ================= */
function updateSummary(data){

  if(data.length === 0){
    avgNoise.innerText = "0 dB";
    peakNoise.innerText = "0 dB";
    totalRecords.innerText = "0";
    return;
  }

  const avg = (
    data.reduce((sum, d) => sum + Number(d.avg_db), 0) / data.length
  ).toFixed(2);

  const peak = Math.max(...data.map(d => Number(d.peak_db)));

  avgNoise.innerText = avg + " dB";
  peakNoise.innerText = peak.toFixed(2) + " dB";
  totalRecords.innerText = data.length;
}

/* ================= BUILD GRAPH ================= */
function buildChart(data){

  let labels = [];
  let values = [];

  data.forEach(d=>{
    const date = new Date(d.time);

    let label;

    if(rangeFilter.value === "daily"){
      label = date.getHours() + ":00";
    }
    else if(rangeFilter.value === "weekly"){
      label = date.toLocaleDateString();
    }
    else{
      label = date.getFullYear() + "-" + (date.getMonth()+1);
    }

    labels.push(label);
    values.push(Number(d.avg_db));
  });

  if(chart) chart.destroy();

  chart = new Chart(document.getElementById("mainChart"),{
    type: rangeFilter.value === "weekly" ? "bar" : "line",
    data:{
      labels,
      datasets:[{
        label:"Average dB",
        data:values,
        borderWidth:3,
        tension:.4,
        fill:true,
        backgroundColor:"rgba(59,130,246,0.15)",
        borderColor:"#3b82f6"
      }]
    },
    options:{
      responsive:true,
      plugins:{
        legend:{
          labels:{
            color:"#334155",
            font:{size:13}
          }
        }
      },
      scales:{
        x:{ grid:{display:false} },
        y:{
          beginAtZero:true,
          grid:{ color:"rgba(0,0,0,0.05)" }
        }
      }
    }
  });
}

/* ================= OPTIONAL REALTIME ================= */
/* Uncomment if gusto mo realtime updates */
/*
supabase
.channel('realtime-minute')
.on(
  'postgres_changes',
  {
    event: 'INSERT',
    schema: 'public',
    table: 'device_readings'
  },
  () => {
    loadReports(); // reload aggregated data
  }
)
.subscribe();
*/

/* ================= EVENTS ================= */
deviceFilter.onchange = loadReports;
rangeFilter.onchange = loadReports;

/* ================= INIT ================= */
loadDevices();
loadReports();