import { useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function ReportsGraph() {
  const [data, setData] = useState([]);

  useEffect(() => {
    window.renderReportsGraph = (incomingData) => {
      setData(incomingData);
    };
  }, []);

  if (data.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

        <XAxis 
          dataKey="label" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 11, fill: "#94a3b8" }} 
          dy={10} 
        />

        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 11, fill: "#94a3b8" }} 
          tickFormatter={(v) => `${v}dB`} 
        />

        {/* FIX: Filtered Tooltip para hindi madoble yung labels */}
        <Tooltip
          cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
          contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px" }}
          // Dito natin aalisin yung extra 'avg' entry
          itemSorter={(item) => (item.dataKey === 'avg' ? -1 : 1)}
        />

        <Legend
          verticalAlign="top"
          align="right"
          iconType="circle"
          wrapperStyle={{ paddingBottom: "20px", fontSize: "12px", fontWeight: 600 }}
        />

        {/* BACKGROUND AREA (Naka-hide sa Legend para hindi mag-duplicate) */}
        <Area
          type="monotone"
          dataKey="avg"
          stroke="none"
          fillOpacity={1}
          fill="url(#colorAvg)"
          legendType="none" // ITO ANG NAG-AALIS SA LEGEND
          tooltipType="none" // ITO ANG NAG-AALIS SA TOOLTIP
        />

        {/* MAIN AVERAGE LINE */}
        <Line
          type="monotone"
          dataKey="avg"
          name="Average Noise"
          stroke="#10b981"
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />

        {/* PEAK NOISE LINE */}
        <Line
          type="monotone"
          dataKey="peak"
          name="Peak Noise"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
