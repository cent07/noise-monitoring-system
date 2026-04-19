const express = require("express");
const WebSocket = require("ws");

const audioBuffers = {};
const MAX_CHUNKS = 250; // ~5 seconds (depende sa rate mo)
const app = express();
const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

// 🔥 store per device
const devices = {};

const wss = new WebSocket.Server({ server, path: "/" });

wss.on("connection", (ws, request) => {
  ws.isAlive = true;

  ws.on("pong", () => {
    ws.isAlive = true;
  });
  // ✅ GET DEVICE FROM URL
  const url = new URL(request.url, "http://localhost");
  const device = url.searchParams.get("device") || "unknown";

  console.log("Connected:", device);

  if (!devices[device]) {
    devices[device] = new Set();
  }

  devices[device].add(ws);
  ws.deviceName = device;

ws.on("message", (data) => {

  // 🔥 STORE AUDIO BUFFER
  if (!audioBuffers[device]) {
    audioBuffers[device] = [];
  }

  audioBuffers[device].push(data);

  if (audioBuffers[device].length > MAX_CHUNKS) {
    audioBuffers[device].shift();
  }

  // 🔁 realtime broadcast (unchanged)
  devices[device].forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });

});

  ws.on("close", () => {
    devices[device].delete(ws);

    if (devices[device].size === 0) {
      delete devices[device];
    }

    console.log("Disconnected:", device);
  });
});

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://vuzgotyghqsyjdjrbuwu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);

async function saveWav(device, alertId) {

  const chunks = audioBuffers[device];

 if (!chunks || chunks.length < 10) {
  console.log("❌ Not enough audio data");
  return;
}

  const buffer = Buffer.concat(chunks);

  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;

  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;

  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + buffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(buffer.length, 40);

  const wav = Buffer.concat([header, buffer]);

  const fileName = `${device}_${alertId}.wav`;

  const { error } = await supabase.storage
    .from("alert-audio")
    .upload(fileName, wav, {
      contentType: "audio/wav",
      upsert: true
    });

  if (error) {
    console.log("❌ Upload error:", error.message);
  } else {
    console.log("☁️ Uploaded:", fileName);
  }
}

const axios = require("axios");

let lastAlertId = null;

setInterval(async () => {

  try {
    const res = await axios.get(
      "https://vuzgotyghqsyjdjrbuwu.supabase.co/rest/v1/device_alerts?order=id.desc&limit=1",
      {
        headers: {
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
        }
      }
    );

    const alert = res.data[0];
    if (!alert) return;

    if (alert.id === lastAlertId) return;

    lastAlertId = alert.id;

    if (alert.status === "Critical") {
      console.log("🚨 RECORDING:", alert.id);

      await saveWav(alert.device_name, alert.id);
    }

  } catch (err) {
    console.log("Polling error:", err.message);
  }

}, 2000);
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 30000);