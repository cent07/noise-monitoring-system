// CENTER SA SCHOOL (pwede mo change later)
const map = L.map("noiseMap").setView([14.3294,120.9367],19)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
maxZoom:22
}).addTo(map)


// ===== SAMPLE DEVICE DATA (UI DEMO ONLY) =====
let devices = [
{
id:"ESP32_1",
lat:14.3294,
lng:120.9367,
db:25,
location:"CCTE Dept"
},
{
id:"ESP32_2",
lat:14.3296,
lng:120.9369,
db:68,
location:"Room 204"
},
{
id:"ESP32_3",
lat:14.3292,
lng:120.9364,
db:92,
location:"Hallway"
}
]


function getColor(db){
if(db < 50) return "#22c55e"
if(db < 70) return "#eab308"
if(db < 90) return "#f97316"
return "#ef4444"
}

let markers = []

function renderMarkers(){

markers.forEach(m => map.removeLayer(m))
markers = []

devices.forEach(d=>{

const marker = L.circleMarker([d.lat,d.lng],{
radius:14,
fillColor:getColor(d.db),
color:"#111",
weight:2,
fillOpacity:0.95
}).addTo(map)

marker.bindPopup(`
<b>${d.id}</b><br>
Location: ${d.location}<br>
Noise Level: ${d.db} dB
`)

markers.push(marker)

})

}

renderMarkers()



// ===== DEMO REALTIME CHANGE (for thesis demo UI) =====
setInterval(()=>{

devices = devices.map(d=>{
return {
...d,
db: Math.floor(Math.random()*100)
}
})

renderMarkers()

},3000)