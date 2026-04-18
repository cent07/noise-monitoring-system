const express = require("express");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

// 🔥 store per device
const devices = {};
let counter = 1;
const url = new URL(request.url, "http://localhost");
const device = url.searchParams.get("device");

const wss = new WebSocket.Server({ server, path: "/" });

wss.on("connection", (ws) => {

  // 👉 AUTO ASSIGN DEVICE
  const device = "ESP32_" + counter++;
  console.log("Connected:", device);

  if (!devices[device]) {
    devices[device] = new Set();
  }

  devices[device].add(ws);

  ws.deviceName = device;

  ws.on("message", (data) => {

    // 👉 send ONLY to same device
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