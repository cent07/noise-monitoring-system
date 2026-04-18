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

  connectWebSocket(currentDevice);
}

function connectWebSocket(deviceName){

  ws = new WebSocket("wss://noise-monitoring-system.onrender.com/ws/" + deviceName);

  ws.onopen = () => {
    console.log("✅ Connected to:", deviceName);
  };

  ws.onmessage = (event) => {

    const base64 = event.data;

    // 🔥 decode base64 → binary
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const input = new Int16Array(bytes.buffer);

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
      nextTime = audioCtx.currentTime + 0.05;
    }

    source.start(nextTime);
    nextTime += buffer.duration;
  };

  ws.onclose = () => {
    console.log("⚠️ Disconnected:", deviceName);
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

  if(!currentDevice){
    alert("Select a device first");
    return;
  }

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
    const { data } = await supabase.from("devices").select("*");

    deviceSelect.innerHTML = `<option value="">Select Device</option>`;

    data.forEach(device => {
      const option = document.createElement("option");
      option.value = device.device_name;
      option.textContent = `${device.device_name} (${device.location})`;
      deviceSelect.appendChild(option);
    });

    if(data.length > 0){
      deviceSelect.value = data[0].device_name;
    }
  }
async function loadNodes(){

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
    node.classList.add("node", "normal");

    node.style.left = device.pos_x + "%";
    node.style.top = device.pos_y + "%";

    node.innerHTML = `<span class="label">${device.device_name}</span>`;

    node.addEventListener("click", (e) => {
      if(isDragging) return;

      e.stopPropagation();

      currentDevice = device.device_name;
      deviceLabel.textContent = device.device_name;

      audioPopup.classList.remove("hidden");

      playBtn.style.display = "block";
      stopBtn.style.display = "none";
    });

    floorContainer.appendChild(node);
    deviceNodes[device.device_name] = node;

    makeDraggable(node, device.device_name);
  });
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
    node.classList.add("node", "normal");
    node.style.left = x + "%";
    node.style.top = y + "%";
    node.innerHTML = `<span class="label">${selectedDevice}</span>`;

node.addEventListener("click", (e) => {
  e.stopPropagation();

  currentDevice = selectedDevice;
  deviceLabel.textContent = selectedDevice;

  audioPopup.classList.remove("hidden");

  // 🔥 RESET BUTTONS EVERY OPEN
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

});