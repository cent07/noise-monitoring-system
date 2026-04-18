const express = require("express");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

// 🔥 store clients per device
const devices = {};

const wss = new WebSocket.Server({ server, path: "/" });

wss.on("connection", (ws, req) => {

  // 👉 detect device from query
  const url = new URL(req.url, "http://localhost");
  const device = url.searchParams.get("device");

  console.log("Connected:", device || "UNKNOWN");

  if (device) {
    if (!devices[device]) {
      devices[device] = new Set();
    }
    devices[device].add(ws);
  }

  ws.on("message", (data) => {

    // 👉 send ONLY to same device
    if (!device || !devices[device]) return;

    devices[device].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on("close", () => {
    if (device && devices[device]) {
      devices[device].delete(ws);

      if (devices[device].size === 0) {
        delete devices[device];
      }
    }

    console.log("Disconnected:", device);
  });
});