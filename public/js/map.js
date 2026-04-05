// ===== MAP INIT =====
const map = L.map("noiseMap").setView([14.3294,120.9367],17);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
  maxZoom:22
}).addTo(map);


// ===== AUDIO GLOBAL =====
let socket = null;
let audioCtx = null;
let isPlaying = false;


// ===== SAMPLE DEVICE =====
let devices = [
{
  id:"ESP32_2",
  lat:14.3294,
  lng:120.9367,
  db:60,
  location:"Room 204"
}
];


// ===== COLOR =====
function getColor(db){
  if(db < 50) return "#22c55e";
  if(db < 70) return "#eab308";
  if(db < 90) return "#f97316";
  return "#ef4444";
}


// ===== MARKERS =====
let markers = [];

function renderMarkers(){

  markers.forEach(m => map.removeLayer(m));
  markers = [];

  devices.forEach(d=>{

    const marker = L.circleMarker([d.lat,d.lng],{
      radius:14,
      fillColor:getColor(d.db),
      color:"#111",
      weight:2,
      fillOpacity:0.95
    }).addTo(map);

    marker.on("click", function () {

      document.getElementById("audioPopup").style.display = "flex";
      document.getElementById("deviceLabel").innerText = "Device: " + d.id;

    });

    markers.push(marker);
  });
}

renderMarkers();


// ===== AUDIO STREAM =====
function startAudio(){

  socket = new WebSocket("wss://noise-monitoring-system.onrender.com");
  socket.binaryType = "arraybuffer";

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 3; // 🔊 volume
  gainNode.connect(audioCtx.destination);

  socket.onopen = () => {
    console.log("Admin connected");
    socket.send(JSON.stringify({ type: "admin" }));
  };

  socket.onmessage = (event) => {

    if (!isPlaying) return;

    const int16 = new Int16Array(event.data);
    const float32 = new Float32Array(int16.length);

    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buffer = audioCtx.createBuffer(1, float32.length, 44100);
    buffer.copyToChannel(float32, 0);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    source.start();
  };

  socket.onerror = (err) => {
    console.error("WS error:", err);
  };

  socket.onclose = () => {
    console.log("WS closed");
  };
}


// ===== PLAY =====
document.getElementById("playAudio").onclick = async () => {

  isPlaying = true;

  if (!socket){
    startAudio();
  }

  if(audioCtx && audioCtx.state === "suspended"){
    await audioCtx.resume();
  }
};


// ===== STOP =====
document.getElementById("stopAudio").onclick = () => {
  isPlaying = false;
};


// ===== CLOSE POPUP =====
document.getElementById("audioPopup").onclick = (e) => {

  if(e.target.id === "audioPopup"){
    document.getElementById("audioPopup").style.display = "none";
    isPlaying = false;
  }
};