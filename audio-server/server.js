const express = require("express");
const WebSocket = require("ws");
const { RTCPeerConnection, nonstandard } = require("wrtc");

const app = express();
app.use(express.json());

// Render uses dynamic port
const PORT = process.env.PORT || 10000;

// ================= HTTP SERVER =================
const server = app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

// ================= WEBSOCKET (ESP32) =================
const wss = new WebSocket.Server({ 
  server,
  path: "/"
});

let audioSource = new nonstandard.RTCAudioSource();
let track = audioSource.createTrack();

wss.on("connection", (ws) => {
  console.log("ESP32 Connected");

  ws.on("message", (data) => {
    try {
      const samples = new Int16Array(data);

      audioSource.onData({
        samples: samples,
        sampleRate: 16000,
        bitsPerSample: 16,
        channelCount: 1,
      });

    } catch (err) {
      console.log("Audio error:", err);
    }
  });

  // ✅ KEEP ALIVE (IMPORTANT)
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

// ================= WEBRTC =================
let peerConnection;

app.post("/offer", async (req, res) => {
  try {
    peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    });

    peerConnection.addTrack(track);

    await peerConnection.setRemoteDescription(req.body);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    res.json(peerConnection.localDescription);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});