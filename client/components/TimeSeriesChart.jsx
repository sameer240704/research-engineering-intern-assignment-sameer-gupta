import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const TimeSeriesChart = ({ data }) => {
  const processedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg">
          <p className="font-medium text-slate-900 dark:text-white">{label}</p>
          <p className="text-emerald-600 dark:text-emerald-400">
            <span className="font-semibold">{payload[0].value}</span> posts
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={processedData}
        margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fill: "#64748b" }} tickMargin={10} />
        <YAxis tick={{ fill: "#64748b" }} tickMargin={10} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{
            paddingTop: 10,
            fontSize: "14px",
            color: "#64748b",
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          name="Post Count"
          stroke="#10b981"
          strokeWidth={3}
          dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
          activeDot={{ r: 6, stroke: "#059669", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TimeSeriesChart;
