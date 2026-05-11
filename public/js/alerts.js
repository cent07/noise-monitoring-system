import { createClient } from
"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
"https://vuzgotyghqsyjdjrbuwu.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);

/* ================= AUTH ================= */
const { data:{ session } } = await supabase.auth.getSession();
if(!session) location.href="auth.html";

/* ================= ELEMENTS ================= */
const filterDevice = document.getElementById("filterDevice");
const searchBox = document.getElementById("searchBox");
const filterDate = document.getElementById("filterDate");

const container = document.getElementById("alertsContainer");

const totalAlerts = document.getElementById("totalAlerts");
const latestDevice = document.getElementById("latestDevice");
const highestDb = document.getElementById("highestDb");

/* ================= MODALS ================= */
const alertModal = document.getElementById("alertModal");
const closeModal = document.getElementById("closeModal");

const logoutModal = document.getElementById("logoutModal");
const logoutBtn = document.getElementById("logoutBtn");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");

/* ================= MODAL TEXT ================= */
const mTitle = document.getElementById("mTitle");
const mLocation = document.getElementById("mLocation");
const mStatus = document.getElementById("mStatus");
const mTime = document.getElementById("mTime");

const playBtn = document.getElementById("playAudio");
const audioPlayer = document.getElementById("audioPlayer");

/* ================= PAGINATION ================= */
let currentPage = 1;
const perPage = 5;

let masterData = [];
let allAlerts = [];
let currentAudioFile = null;

/* ================= AUDIO ================= */
playBtn.onclick = () => {

  if(!currentAudioFile){
    alert("No audio found");
    return;
  }

  const url =
  `https://vuzgotyghqsyjdjrbuwu.supabase.co/storage/v1/object/public/alert-audio/${currentAudioFile}`;

  audioPlayer.src = url;
  audioPlayer.play();
};

/* ================= CLOSE MODAL ================= */
closeModal.onclick = ()=>{
  alertModal.classList.remove("show");
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
};

alertModal.onclick = (e)=>{
  if(e.target === alertModal){
    alertModal.classList.remove("show");
  }
};

/* ================= LOGOUT ================= */
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

/* ================= LOAD DEVICES ================= */
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

/* ================= FILTER ================= */
function applyFilters(){

  let list = [...masterData];

  const dev = filterDevice.value;
  const search = searchBox.value.toLowerCase();
  const date = filterDate.value;

  if(dev){
    list = list.filter(a=>a.device_name === dev);
  }

  if(search){
    list = list.filter(a =>
      (a.device_name||"").toLowerCase().includes(search) ||
      (a.location||"").toLowerCase().includes(search)
    );
  }

  if(date){
    list = list.filter(a=>{
      const d = new Date(a.created_at);
      const iso = d.toISOString().split("T")[0];
      return iso === date;
    });
  }

  allAlerts = list;
  currentPage = 1;

  render();
  loadStats();
}

/* ================= RENDER ================= */
function render(){

  container.innerHTML = "";

  if(!allAlerts.length){
    container.innerHTML =
    "<p style='text-align:center'>No alerts found</p>";
    return;
  }

  const start = (currentPage - 1) * perPage;
  const end = start + perPage;

  const pageData = allAlerts.slice(start, end);

  pageData.forEach(a=>{

    const time = new Date(a.created_at);

    const card = document.createElement("div");
    card.className = "alert-card";

    // 🔥 dynamic color
    const db = Number(a.db);
    const levelColor = "#ef4444"; 

    card.innerHTML = `
    <div class="alert-left">
      <div class="alert-title" style="color:${levelColor}">
        ${a.device_name} — ${db.toFixed(1)} dB
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
      `${a.device_name} — ${db.toFixed(1)} dB`;

      mLocation.innerText = a.location || "-";
      mStatus.innerText = "CRITICAL";
      mTime.innerText = time.toLocaleString();

      currentAudioFile = `${a.device_name}_${a.id}.wav`;

      alertModal.classList.add("show");
    };

    container.appendChild(card);
  });

  updatePagination();
}

/* ================= PAGINATION ================= */
function updatePagination(){

  const totalPages = Math.ceil(allAlerts.length / perPage);

  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");

  if(!pageInfo) return;

  pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;

  prevBtn.onclick = ()=>{
    if(currentPage > 1){
      currentPage--;
      render();
    }
  };

  nextBtn.onclick = ()=>{
    if(currentPage < totalPages){
      currentPage++;
      render();
    }
  };
}
async function loadStats(){

  const dev = filterDevice.value;

  let query = supabase.from("device_alerts").select("*", { count: "exact", head: true });

  // 🔥 APPLY DEVICE FILTER
  if(dev){
    query = query.eq("device_name", dev);
  }

  const { count } = await query;

  totalAlerts.innerText = count || 0;


  // 🔥 LATEST DEVICE (GLOBAL - HUWAG I-FILTER)
  const { data: latest } = await supabase
  .from("device_alerts")
  .select("device_name")
  .order("created_at", { ascending: false })
  .limit(1)
  .single();

  latestDevice.innerText = latest?.device_name || "-";


  // 🔥 HIGHEST DB (FILTERED)
  let highestQuery = supabase
    .from("device_alerts")
    .select("db")
    .order("db", { ascending: false })
    .limit(1);

  if(dev){
    highestQuery = highestQuery.eq("device_name", dev);
  }

  const { data: highest } = await highestQuery.single();

  highestDb.innerText = highest
    ? Number(highest.db).toFixed(1) + " dB"
    : "0 dB";
}
loadDevices();
loadAlerts();
loadStats(); 
/* ================= LOAD ALERTS ================= */
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

/* ================= REALTIME ================= */
supabase.channel("alerts")
.on(
"postgres_changes",
{event:"INSERT",schema:"public",table:"device_alerts"},
()=>{
  loadAlerts();
  loadStats();
}
)
.subscribe();

/* ================= EVENTS ================= */
filterDevice.onchange = applyFilters;
searchBox.oninput = applyFilters;
filterDate.onchange = applyFilters;
