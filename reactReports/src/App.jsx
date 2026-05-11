import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

export default function ReportsGraph({ data }) {

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>

        <CartesianGrid strokeDasharray="3 3" />

        <XAxis dataKey="label" />
        <YAxis />

        <Tooltip />

        {/* 🔵 Average */}
        <Line
          type="monotone"
          dataKey="avg"
          stroke="#3b82f6"
          strokeWidth={3}
          dot={{ r: 3 }}
        />

        {/* 🔴 Peak */}
        <Line
          type="monotone"
          dataKey="peak"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 4 }}
        />

      </LineChart>
    </ResponsiveContainer>
  );
}