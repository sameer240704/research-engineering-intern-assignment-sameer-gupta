"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, TrendingUp, Hash, BarChart2, PieChart } from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { COLORS } from "@/constants/colors";

const TopicTrends = ({ topicsData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visualizationType, setVisualizationType] = useState("bar");

  const processedData = (() => {
    const totalCount = topicsData.reduce((sum, item) => sum + item.count, 0);

    return topicsData.map((item) => ({
      ...item,
      percentage: ((item.count / totalCount) * 100).toFixed(1),
    }));
  })();

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={600}>
      <BarChart
        data={processedData}
        margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis
          dataKey="topic"
          angle={-45}
          textAnchor="end"
          height={70}
          tick={{ fontSize: 12 }}
        />
        <YAxis />
        <Tooltip
          formatter={(value, name, props) => [`${value} posts`, "Count"]}
          labelFormatter={(label) => `Topic: ${label}`}
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            border: "none",
          }}
        />
        <Legend />
        <Bar dataKey="count" name="Post Count" radius={[4, 4, 0, 0]}>
          {processedData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsPieChart>
        <Pie
          data={processedData}
          cx="50%"
          cy="50%"
          labelLine={true}
          outerRadius={130}
          innerRadius={60}
          fill="#8884d8"
          dataKey="count"
          nameKey="topic"
          label={({ topic, percentage }) => `${topic}: ${percentage}%`}
        >
          {processedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name, props) => [
            `${value} posts (${props.payload.percentage}%)`,
            "Count",
          ]}
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            border: "none",
          }}
        />
        <Legend layout="horizontal" verticalAlign="bottom" align="center" />
      </RechartsPieChart>
    </ResponsiveContainer>
  );

  const renderTopicTable = () => (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Rank
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Topic
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Count
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Percentage
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
          {processedData.map((topic, index) => (
            <tr
              key={topic.topic}
              className={
                index % 2 === 0
                  ? "bg-white dark:bg-slate-900"
                  : "bg-slate-50 dark:bg-slate-800/50"
              }
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                {index + 1}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white flex items-center">
                <span
                  className="h-3 w-3 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></span>
                {topic.topic}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                {topic.count.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                {topic.percentage}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
      <CardHeader className="p-5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trending Topics
            </CardTitle>
            <CardDescription className="text-violet-100">
              Most discussed topics in the selected timeframe
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {error ? (
          <div className="flex justify-center items-center h-[400px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="text-center">
              <p className="text-red-500">Error: {error}</p>
              <Button variant="outline" className="mt-4">
                Try Again
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center h-[400px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 animate-spin text-violet-400" />
              <p>Loading trending topics...</p>
            </div>
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex justify-center items-center h-[400px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="text-center">
              <Hash className="h-12 w-12 mx-auto mb-2 text-slate-300" />
              <p>No trending topics found</p>
              <p className="text-sm text-slate-400 mt-1">
                Try adjusting your search parameters
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <Tabs
                value={visualizationType}
                onValueChange={setVisualizationType}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger
                    value="bar"
                    className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-900/30 dark:data-[state=active]:text-violet-400"
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    Bar Chart
                  </TabsTrigger>
                  <TabsTrigger
                    value="pie"
                    className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-900/30 dark:data-[state=active]:text-violet-400"
                  >
                    <PieChart className="h-4 w-4 mr-2" />
                    Pie Chart
                  </TabsTrigger>
                  <TabsTrigger
                    value="table"
                    className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-900/30 dark:data-[state=active]:text-violet-400"
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    Table View
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="bar" className="p-0">
                  {renderBarChart()}
                </TabsContent>
                <TabsContent value="pie" className="p-0">
                  {renderPieChart()}
                </TabsContent>
                <TabsContent value="table" className="p-0">
                  {renderTopicTable()}
                </TabsContent>
              </Tabs>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-5 w-5 text-violet-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    Analysis Summary
                  </p>
                  <p className="mt-1">
                    Showing {processedData.length} trending topics with a total
                    of{" "}
                    {processedData
                      .reduce((sum, item) => sum + item.count, 0)
                      .toLocaleString()}{" "}
                    posts. The top topic is "{processedData[0]?.topic}" with{" "}
                    {processedData[0]?.percentage}% of the total discussion.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TopicTrends;
