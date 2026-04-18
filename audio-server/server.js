const express = require("express");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Server alive");
});

const server = app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

// 👉 device listeners
const deviceClients = {};

// ================= ESP32 =================
const wssSend = new WebSocket.Server({ server, path: "/send" });

wssSend.on("connection", (ws, req) => {

  const url = new URL(req.url, "http://localhost");
  const device = url.searchParams.get("device");

  if (!device) {
    ws.close();
    return;
  }

  console.log("📡 ESP32 connected:", device);

  ws.on("message", (data, isBinary) => {

    if (!isBinary) return;

    if (!deviceClients[device]) return;

    deviceClients[device].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: true });
      }
    });

  });

  ws.on("close", () => {
    console.log("❌ ESP32 disconnected:", device);
  });
});

// ================= BROWSER =================
const wssListen = new WebSocket.Server({ server, path: "/ws" });

wssListen.on("connection", (ws, req) => {

  const parts = req.url.split("/");
  const device = parts[2];

  if (!device) {
    ws.close();
    return;
  }

  console.log("🧑‍💻 Listening to:", device);

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