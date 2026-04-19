const { createClient } = require("@supabase/supabase-js");
const express = require("express");
const WebSocket = require("ws");
const axios = require("axios");

const supabase = createClient(
  "https://vuzgotyghqsyjdjrbuwu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);

const app = express();
const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

// 🔥 devices + audio buffers
const devices = {};
const audioBuffers = {};

// =====================================================
// 🔥 SAVE AUDIO FUNCTION
// =====================================================

async function saveWav(device, alertId) {

  const chunks = audioBuffers[device];

  console.log("🎧 Saving audio for:", device);
  console.log("Chunks length:", chunks ? chunks.length : 0);

  if (!chunks || chunks.length === 0) {
    console.log("❌ No audio buffer!");
    return;
  }

  const buffer = Buffer.concat(chunks);

  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;

  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;

  const wavHeader = Buffer.alloc(44);

  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(36 + buffer.length, 4);
  wavHeader.write("WAVE", 8);
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(buffer.length, 40);

  const finalBuffer = Buffer.concat([wavHeader, buffer]);

  const fileName = `${device}_${alertId}.wav`;

  const { error } = await supabase.storage
    .from("alert-audio")
    .upload(fileName, finalBuffer, {
      contentType: "audio/wav",
      upsert: true
    });

  if (error) {
    console.log("❌ Upload error:", error.message);
  } else {
    console.log("☁️ Uploaded:", fileName);
  }

  // 🔥 clear buffer after save
  audioBuffers[device] = [];
}

// =====================================================
// 🔥 WEBSOCKET SERVER
// =====================================================

const wss = new WebSocket.Server({ server, path: "/" });

wss.on("connection", (ws, request) => {

  const url = new URL(request.url, "http://localhost");
  const device = url.searchParams.get("device") || "unknown";

  console.log("Connected:", device);

  if (!devices[device]) {
    devices[device] = new Set();
  }

  devices[device].add(ws);

  ws.on("message", (data) => {

    if (!data || data.length === 0) return;

    // 🔥 store audio buffer
    if (!audioBuffers[device]) {
      audioBuffers[device] = [];
    }

    audioBuffers[device].push(data);

    // 🔥 keep only last chunks
    if (audioBuffers[device].length > 25) {
      audioBuffers[device].shift();
    }

    // broadcast (optional)
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

// =====================================================
// 🔥 ALERT POLLING
// =====================================================

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

    console.log("🚨 ALERT DETECTED:", alert.id);

    // 🔥 delay para makaipon audio
    setTimeout(async () => {
      await saveWav(alert.device_name, alert.id);
    }, 1500);

  } catch (err) {
    console.log("Polling error:", err.message);
  }

}, 2000);