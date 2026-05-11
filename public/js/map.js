import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://vuzgotyghqsyjdjrbuwu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU";

const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {

  const floorSelect = document.getElementById("floorSelect");
  const floorImage = document.getElementById("floorImage");
  const deviceSelect = document.getElementById("deviceSelect");
  const floorContainer = document.getElementById("floorContainer");
  const mapWrapper = document.getElementById("mapWrapper");

// ZOOM STATE
let scale = 1;
let translateX = 0;
let translateY = 0;
let ws;
let audioCtx;
let gainNode;
let nextTime = 0;
let reconnectInterval = null;
let deviceNodes = {};
const roomSummary = document.getElementById("roomSummary");

let thresholdsMap = {};
let latestReadings = {};
const audioPopup = document.getElementById("audioPopup");
const deviceLabel = document.getElementById("deviceLabel");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const closePopupBtn = document.getElementById("closePopupBtn");


let currentDevice = null;
let isDragging = false;
stopBtn.style.display = "none";

const selectPopup = document.getElementById("selectDevicePopup");
const deviceSelectPopup = document.getElementById("deviceSelectPopup");
const confirmBtn = document.getElementById("confirmDeviceBtn");
const cancelBtn = document.getElementById("cancelDeviceBtn");


async function loadThresholds(){
  const { data } = await supabase
    .from("device_thresholds")
    .select("*");

  thresholdsMap = {};

  data.forEach(t => {
    thresholdsMap[t.device_name] = {
      normal: t.normal,
      moderate: t.moderate,
      critical: t.critical
    };
  });
}

async function loadLatestReadings(){

  const { data } = await supabase
    .from("device_readings")
    .select("*")
    .order("created_at", { ascending: false });

  latestReadings = {};

data.forEach(d => {
  if(!latestReadings[d.device_name]){
   latestReadings[d.device_name] = {
  db: d.db,
  time: d.created_at
};
  }
});
}

function getDynamicStatus(avg, devices){

  let totalNormal = 0;
  let totalModerate = 0;
  let totalCritical = 0;
  let count = 0;

  devices.forEach(d => {
    const t = thresholdsMap[d.device_name];
    if(!t) return;

    totalNormal += t.normal;
    totalModerate += t.moderate;
    totalCritical += t.critical;
    count++;
  });

  if(count === 0){
    return { text: "No Data", color: "green" };
  }

  const normal = totalNormal / count;
  const moderate = totalModerate / count;

  if(avg <= normal){
    return { text: "Normal", color: "green" };
  } 
  else if(avg <= moderate){
    return { text: "Moderate", color: "yellow" };
  } 
  else {
    return { text: "Critical", color: "red" };
  }
}

function updateRoomSummary(devices){

  const groups = {};

  // GROUP BY LOCATION
  devices.forEach(d => {
    const loc = d.location || "Unknown";

    if(!groups[loc]) groups[loc] = [];
    groups[loc].push(d);
  });

  let html = "";

  Object.keys(groups).forEach(loc => {

    const roomDevices = groups[loc];

let activeDevices = 0;

const total =
  roomDevices.reduce((sum, d) => {

    const data = latestReadings[d.device_name];

    if(!data) return sum; // walang data → skip

    const lastTime = new Date(data.time).getTime();
    const now = Date.now();

    // kung luma na → offline → skip
    if((now - lastTime) > 3000) return sum;

    activeDevices++; // count lang pag online
    return sum + data.db;

  }, 0);

const avg = activeDevices > 0 ? total / activeDevices : 0;

    let status;

if(activeDevices === 0){
  status = { text: "Offline", color: "gray" };
} else {
  status = getDynamicStatus(avg, roomDevices);
}
    html += `
      <div class="room-card ${status.color}">
        
<div class="room-title">
  Room ${loc}
</div>

        <div class="room-stats">
          <span>${activeDevices === 0 ? "0.0" : avg.toFixed(1)} dB</span>
          <span>${roomDevices.length} devices</span>
          <span>${status.text}</span>
        </div>

      </div>
    `;
  });

  roomSummary.innerHTML = html;
  roomSummary.classList.remove("hidden");
}
// OPEN POPUP
function openDevicePopup(){

  deviceSelectPopup.innerHTML = deviceSelect.innerHTML;

  selectPopup.classList.remove("hidden");
}
function startLiveAudio(){

  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.resume();

  gainNode = audioCtx.createGain();
  gainNode.gain.value = 1;
  gainNode.connect(audioCtx.destination);

  nextTime = 0;

  connectWebSocket();
}

function connectWebSocket(){

  ws = new WebSocket(`wss://noise-monitoring-system.onrender.com/?device=${currentDevice}`);
  ws.binaryType = "arraybuffer";

  ws.onopen = () => {
    console.log("✅ Connected to audio:", currentDevice);
  };

  ws.onmessage = (event) => {

  if (!audioCtx) return; // 🔥 IMPORTANT FIX

  const input = new Int16Array(event.data);

  const float32 = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    float32[i] = input[i] / 32768;
  }

  const buffer = audioCtx.createBuffer(1, float32.length, 16000);
  buffer.copyToChannel(float32, 0);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(gainNode);

  if (nextTime < audioCtx.currentTime) {
    nextTime = audioCtx.currentTime; // 🔥 REMOVE DELAY OFFSET
  }

  source.start(nextTime);
  nextTime += buffer.duration;
};

  ws.onclose = () => {
    console.log("⚠️ Reconnecting...");
    reconnectInterval = setTimeout(() => {
      if (audioCtx) connectWebSocket();
    }, 2000);
  };
}

function stopLiveAudio(){

  if (ws) {
    ws.close();
    ws = null;
  }

  if (reconnectInterval){
    clearTimeout(reconnectInterval);
    reconnectInterval = null;
  }

  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }

  nextTime = 0;
}

// CONFIRM
confirmBtn.addEventListener("click", () => {

  const selected = deviceSelectPopup.value;

  if(!selected){
    alert("Please select a device");
    return;
  }

  deviceSelect.value = selected;

  selectPopup.classList.add("hidden");
});

// CANCEL
cancelBtn.addEventListener("click", () => {
  selectPopup.classList.add("hidden");
});
playBtn.addEventListener("click", () => {
  if(playBtn.disabled) return; // 🔥 safeguard lang

  startLiveAudio();

  playBtn.style.display = "none";
  stopBtn.style.display = "block";
});

stopBtn.addEventListener("click", () => {

  stopLiveAudio();

  stopBtn.style.display = "none";
  playBtn.style.display = "block";
});

closePopupBtn.addEventListener("click", () => {

  stopLiveAudio(); // 🔥 IMPORTANT

  audioPopup.classList.add("hidden");

  stopBtn.style.display = "none";
  playBtn.style.display = "block";
});

floorSelect.addEventListener("change", async function () {

  const selected = this.value;

  floorImage.src = selected + "?t=" + Date.now();

  await loadNodes(); 
});

  // ================= LOAD DEVICES =================
async function loadDevices(){

  const { data } = await supabase
    .from("devices")
    .select("*");

  deviceSelect.innerHTML = `
    <option value="">Select Device</option>
  `;

  data.forEach(device => {

    const option = document.createElement("option");

    option.value = device.device_name;
    option.textContent =
      `${device.device_name} (${device.location})`;

    deviceSelect.appendChild(option);
  });

}``
function getNodeClass(device){

  const data = latestReadings[device.device_name];
  const t = thresholdsMap[device.device_name];

  // ❌ WALANG DATA
  if(!data || !t){
    return "offline";
  }

  // 🔥 CHECK IF ONLINE (LAST 10 SECONDS)
  const now = Date.now();
  const lastTime = new Date(data.time).getTime();

  const isOffline = (now - lastTime) > 10000; // 10 seconds

  if(isOffline){
    return "offline";
  }

  // ✅ ONLINE → saka lang mag color
  if(data.db <= t.normal){
    return "quiet";
  }
  else if(data.db <= t.moderate){
    return "normal";
  }
  else{
    return "critical";
  }
}
async function loadNodes(){

  await loadThresholds();   
  await loadLatestReadings();   

  const currentFloor = floorSelect.value;

  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("floor", currentFloor); // 🔥 FILTER HERE

  if(error){
    console.error("LOAD ERROR:", error);
    return;
  }

  // 🔥 CLEAR OLD NODES
  Object.values(deviceNodes).forEach(node => node.remove());
  deviceNodes = {};

  data.forEach(device => {

    if(device.pos_x == null || device.pos_y == null) return;

    const node = document.createElement("div");
    const statusClass = getNodeClass(device);
  node.classList.add("node", statusClass);

    node.style.left = device.pos_x + "%";
    node.style.top = device.pos_y + "%";

    node.innerHTML = `<span class="label">${device.device_name}</span>`;

    node.addEventListener("click", (e) => {
  if(isDragging) return;

  e.stopPropagation();

  currentDevice = device.device_name;
  deviceLabel.textContent = device.device_name;

  audioPopup.classList.remove("hidden");

  // ✅ ADD THIS
  if(isDeviceOnline(device.device_name)){
    playBtn.disabled = false;
    playBtn.style.opacity = "1";
    playBtn.style.cursor = "pointer";
    playBtn.title = "";
  } else {
    playBtn.disabled = true;
    playBtn.style.opacity = "0.5";
    playBtn.style.cursor = "not-allowed";
    playBtn.title = "Device is offline";
  }

  playBtn.style.display = "block";
  stopBtn.style.display = "none";
});

    floorContainer.appendChild(node);
    deviceNodes[device.device_name] = node;

    makeDraggable(node, device.device_name);
  });
  updateRoomSummary(data);
}
 function updateTransform(){
  mapWrapper.style.transform =
    `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}
floorContainer.addEventListener("click", async function(e){

  if(isDragging) return; // 🔥 IMPORTANT FIX

  const selectedDevice = deviceSelect.value;

 if(!selectedDevice){
  openDevicePopup();
  return;
}

    const rect = floorContainer.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if(deviceNodes[selectedDevice]){
      deviceNodes[selectedDevice].remove();
    }

    const node = document.createElement("div");
    const statusClass = getNodeClass({ device_name: selectedDevice });
    node.classList.add("node", statusClass);
    node.style.left = x + "%";
    node.style.top = y + "%";
    node.innerHTML = `<span class="label">${selectedDevice}</span>`;

node.addEventListener("click", (e) => {
  if(isDragging) return;

  e.stopPropagation();

  currentDevice = device.device_name;
  deviceLabel.textContent = device.device_name;

  audioPopup.classList.remove("hidden");

  // 🔥 ADD THIS BLOCK
  if(isDeviceOnline(device.device_name)){
    playBtn.disabled = false;
    playBtn.style.opacity = "1";
    playBtn.style.cursor = "pointer";
    playBtn.title = "";
  } else {
    playBtn.disabled = true;
    playBtn.style.opacity = "0.5";
    playBtn.style.cursor = "not-allowed";
    playBtn.title = "Device is offline";
  }

  playBtn.style.display = "block";
  stopBtn.style.display = "none";
});
    floorContainer.appendChild(node);
    deviceNodes[selectedDevice] = node;

    makeDraggable(node, selectedDevice);

    // 🔥 SAVE TO DATABASE
    const { error } = await supabase
      .from("devices")
      .update({ pos_x: x, pos_y: y, floor: floorSelect.value
})
      .eq("device_name", selectedDevice);

    console.log("SAVE:", error ? error : "SUCCESS");
  });
function updateNodeColors(){

  Object.keys(deviceNodes).forEach(name => {

    const node = deviceNodes[name];

    const newClass = getNodeClass({ device_name: name });

    node.className = "node " + newClass;

  });
}
function isDeviceOnline(deviceName){

  const data = latestReadings[deviceName];
  if(!data) return false;

  const now = Date.now();
  const lastTime = new Date(data.time).getTime();

  return (now - lastTime) <= 10000; // same logic mo
}
 function makeDraggable(node, deviceName){

  let isDraggingLocal = false;

  function onMouseMove(e){
    if(!isDraggingLocal) return;

    isDragging = true;

    const rect = floorContainer.getBoundingClientRect();

    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    node.style.left = x + "%";
    node.style.top = y + "%";
  }

  async function onMouseUp(){
  if(!isDraggingLocal) return;

  isDraggingLocal = false;

  const x = parseFloat(node.style.left);
  const y = parseFloat(node.style.top);
  const currentFloor = floorSelect.value;

  const { error } = await supabase
    .from("devices")
    .update({ 
      pos_x: x, 
      pos_y: y,
      floor: currentFloor
    })
    .eq("device_name", deviceName);

  if(error){
    console.error("DRAG SAVE ERROR:", error);
  } else {
    console.log("✅ DRAG SAVED:", deviceName, x, y);
  }

  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);

  setTimeout(() => {
    isDragging = false;
  }, 100);
}

  node.addEventListener("mousedown", (e) => {
    e.stopPropagation();

    isDraggingLocal = true;
    isDragging = false;

    // attach ONLY when dragging
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

}
await loadDevices();
await loadNodes();

// ===== REALTIME DEVICE READINGS =====
supabase
  .channel('device-readings-live')

  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'device_readings'
    },

    async (payload) => {

      console.log("REALTIME:", payload);

      const reading = payload.new;

      // 🔥 UPDATE CACHE AGAD
      latestReadings[reading.device_name] = {
        db: reading.db,
        time: reading.created_at
      };

      // 🔥 UPDATE NODE COLORS
      updateNodeColors();

      // 🔥 REFRESH ROOM SUMMARY
      const { data } = await supabase
        .from("devices")
        .select("*")
        .eq("floor", floorSelect.value);

      updateRoomSummary(data);
    }
  )

  .subscribe((status) => {
    console.log("Realtime Status:", status);
  });
// ===== LOGOUT =====
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");

// OPEN MODAL
logoutBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  logoutModal.classList.add("show");
});

// CANCEL
cancelLogout?.addEventListener("click", () => {
  logoutModal.classList.remove("show");
});

// CONFIRM LOGOUT
confirmLogout?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "auth.html";
});
});
