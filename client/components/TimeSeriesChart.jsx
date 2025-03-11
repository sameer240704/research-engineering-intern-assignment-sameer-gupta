import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const TimeSeriesChart = ({ data }) => {
  // Handle empty data case
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">No data available</div>
    );
  }

  const chartData = {
    labels: data.map((item) => item.date),
    datasets: [
      {
        label: "Posts",
        data: data.map((item) => item.count),
        borderColor: "rgba(56, 189, 248, 1)",
        backgroundColor: "rgba(56, 189, 248, 0.1)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(56, 189, 248, 1)",
        pointBorderColor: "#fff",
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        padding: 12,
        cornerRadius: 6,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
    },
  };

  return (
    <div style={{ height: "300px" }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default TimeSeriesChart;
