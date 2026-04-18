const express = require("express");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

const wssSend = new WebSocket.Server({ server, path: "/send" });
const wssListen = new WebSocket.Server({ server, path: "/ws" });

const deviceClients = {};

// ================= ESP32 =================
wssSend.on("connection", (ws) => {
  console.log("📡 ESP32 connected");

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      const device = parsed.device;
      const audio = parsed.audio;

      if (!device || !audio) return;

      if (!deviceClients[device]) {
        deviceClients[device] = new Set();
      }

      console.log("🎤 From:", device, "| listeners:", deviceClients[device].size);

      deviceClients[device].forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(audio);
        }
      });

    } catch (err) {
      console.log("❌ parse error:", err);
    }
  });

  ws.on("close", () => {
    console.log("ESP32 disconnected");
  });
});

// ================= BROWSER =================
wssListen.on("connection", (ws, req) => {

  const parts = req.url.split("/");
  const device = parts.length >= 3 ? parts[2] : null;

  if (!device) {
    console.log("❌ Invalid WS path:", req.url);
    ws.close();
    return;
  }

  console.log("🧑‍💻 Listener for:", device);

  if (!deviceClients[device]) {
    deviceClients[device] = new Set();
  }

  deviceClients[device].add(ws);

  ws.on("close", () => {
    deviceClients[device].delete(ws);

    if (deviceClients[device].size === 0) {
      delete deviceClients[device];
    }

    console.log("❌ Listener left:", device);
  });
});