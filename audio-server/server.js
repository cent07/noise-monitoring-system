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

// 🔥 STORE ALL CLIENTS
const clients = new Set();

wss.on("connection", (ws) => {
  console.log("Client Connected");

  clients.add(ws);

  ws.on("message", (data) => {
    console.log("Audio chunk received:", data.length);

    // 🔥 BROADCAST SA LAHAT NG CLIENT (browser)
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  // KEEP ALIVE
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on("close", () => {
    clients.delete(ws);
    clearInterval(interval);
    console.log("Client Disconnected");
  });
});