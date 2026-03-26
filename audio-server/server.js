const express = require("express")
const http = require("http")
const WebSocket = require("ws")

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

let admins = []
let devices = {}

wss.on("connection",(ws)=>{

console.log("Client connected")

ws.on("message",(msg)=>{

let data
try{ data = JSON.parse(msg) }catch{}

if(data?.type === "admin"){
admins.push(ws)
console.log("Admin connected")
return
}

if(data?.type === "device"){
devices[data.device_id] = ws
console.log("Device:",data.device_id)
return
}

// broadcast audio
admins.forEach(a=>{
if(a.readyState===1){
a.send(msg)
}
})

})

})

app.get("/",(req,res)=>{
res.send("NoiseSense Audio Server Running")
})

// ⭐⭐⭐ IMPORTANT FOR RENDER ⭐⭐⭐
const PORT = process.env.PORT || 3000

server.listen(PORT,()=>{
console.log("Server running on port " + PORT)
})