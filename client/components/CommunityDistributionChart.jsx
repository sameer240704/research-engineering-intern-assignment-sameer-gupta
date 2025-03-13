import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { backgrounds } from "@/constants/colors";

ChartJS.register(ArcElement, Tooltip, Legend);

const CommunityDistributionChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">No data available</div>
    );
  }

  const generateColors = (count) => {
    const borders = backgrounds.map((color) => color.replace("0.8", "1"));

    const backgroundColors = [...Array(count)].map(
      (_, i) => backgrounds[i % backgrounds.length]
    );
    const borderColors = [...Array(count)].map(
      (_, i) => borders[i % borders.length]
    );

    return { backgroundColors, borderColors };
  };

  const { backgroundColors, borderColors } = generateColors(data.length);

  const chartData = {
    labels: data.map((item) => item.name),
    datasets: [
      {
        label: "Posts",
        data: data.map((item) => item.value),
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          boxWidth: 15,
          padding: 15,
          usePointStyle: true,
          pointStyle: "circle",
        },
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
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height: "300px" }}>
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default CommunityDistributionChart;
