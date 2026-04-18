return (
  <div style={{ padding: 20 }}>
    <h2>Noise Analytics</h2>

    <select
      value={range}
      onChange={(e) => setRange(e.target.value)}
      style={{ marginBottom: 20, padding: 8 }}
    >
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
    </select>

    <LineChart
      width={1000}
      height={400}
      data={data}
      style={{ background: "#fff" }}
    >
      <CartesianGrid strokeDasharray="3 3" />

      {/* ✅ FIXED */}
      <XAxis dataKey="name" />

      <YAxis />

      <Tooltip />

      <Line
        type="monotone"
        dataKey="avg"
        stroke="#3b82f6"
        strokeWidth={3}
        dot={{ r: 6 }}
      />
    </LineChart>
  </div>
);