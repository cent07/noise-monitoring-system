import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

const SUPABASE_URL = "https://vuzgotyghqsyjdjrbuwu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"; // palitan mo

export default function App() {

  const [data, setData] = useState([]);
  const [range, setRange] = useState("daily");

  useEffect(() => {
    loadData();
  }, [range]);

  async function loadData() {

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/device_readings?select=db,created_at`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const raw = await res.json();
    processData(raw);
  }

  function processData(raw) {

    let map = {};

    raw.forEach(r => {
      let d = new Date(r.created_at);
      let key;

      if (range === "daily") {
        key = d.toISOString().split("T")[0];
      }

      if (range === "weekly") {
        const week = Math.ceil(d.getDate() / 7);
        key = `Week ${week}`;
      }

      if (range === "monthly") {
        key = `${d.getFullYear()}-${d.getMonth()+1}`;
      }

      if (!map[key]) map[key] = { total: 0, count: 0 };

      map[key].total += r.db;
      map[key].count++;
    });

    const result = Object.keys(map).map(k => ({
      name: k,
      avg: (map[k].total / map[k].count).toFixed(1)
    }));

    setData(result);
  }

  return (
    <div style={{ padding: "20px" }}>

      <h2 style={{ marginBottom: "10px" }}>Noise Analytics</h2>

      {/* FILTER */}
      <select
        value={range}
        onChange={(e)=>setRange(e.target.value)}
        style={{
          padding:"8px 12px",
          borderRadius:"8px",
          border:"1px solid #ccc",
          marginBottom:"15px"
        }}
      >
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>

      {/* ⭐ STEP 3: PREMIUM CARD UI */}
      <div style={{
        background:"#ffffff",
        padding:"20px",
        borderRadius:"16px",
        boxShadow:"0 10px 30px rgba(0,0,0,0.08)"
      }}>

        <div style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="name" />
              <YAxis />

              <Tooltip />

              <Line 
                type="monotone" 
                dataKey="avg" 
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4 }}
              />

            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

    </div>
  );
}