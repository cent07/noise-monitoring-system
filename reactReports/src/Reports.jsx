return (
  <div style={{ padding: 30 }}>

    <h2 style={{ marginBottom: 20 }}>Noise Analytics</h2>

    {/* FILTER */}
    <select
      value={range}
      onChange={(e) => setRange(e.target.value)}
      style={{
        marginBottom: 20,
        padding: 10,
        borderRadius: 8,
        border: "1px solid #e2e8f0"
      }}
    >
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
    </select>

    {/* SUMMARY */}
    <div style={{
      display: "flex",
      gap: 20,
      marginBottom: 25
    }}>
      <div style={cardStyle}>
        <p style={labelStyle}>Average Noise</p>
        <h2>{avg} dB</h2>
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>Peak Noise</p>
        <h2>{peak} dB</h2>
      </div>
    </div>

    {/* GRAPH */}
    <div style={{
      background: "#fff",
      padding: 20,
      borderRadius: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)"
    }}>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>

          <CartesianGrid strokeDasharray="3 3" />

          {/* ✅ FIXED KEY */}
          <XAxis dataKey="label" />

          <YAxis />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
          />

        </LineChart>
      </ResponsiveContainer>

    </div>
  </div>
);