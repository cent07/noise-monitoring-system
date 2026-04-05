const express = require("express");
const WebSocket = require("ws");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

// ================= WEBSOCKET =================
const wss = new WebSocket.Server({ 
  server,
  path: "/"
});

wss.on("connection", (ws) => {
  console.log("ESP32 Connected");

  ws.on("message", (data) => {
    // simple test muna
    console.log("Audio chunk received:", data.length);
  });

  // KEEP ALIVE
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on("close", () => {
    clearInterval(interval);
    console.log("ESP32 Disconnected");
  });
});