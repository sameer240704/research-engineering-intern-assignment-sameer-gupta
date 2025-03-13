"use client";

import { useState, useEffect } from "react";
import TimeSeriesChart from "../components/TimeSeriesChart";
import CommunityDistributionChart from "../components/CommunityDistributionChart";
import NetworkGraph from "../components/NetworkGraph";
import AIAnalysis from "../components/AIAnalysis";
import Chatbot from "../components/Chatbot";
import TopicTrends from "@/components/TopicTrendAnalysis";
import {
  fetchTimeSeries,
  fetchCommunityDistribution,
  fetchNetworkGraph,
  fetchAIAnalysis,
  fetchTopicTrends,
} from "../utils/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  RefreshCw,
  BarChart3,
  Filter,
  LineChart,
  PieChart,
  Network,
  BrainCircuit,
} from "lucide-react";
import toast from "react-hot-toast";

export default function Home() {
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [communityData, setCommunityData] = useState([]);
  const [networkData, setNetworkData] = useState({ nodes: [], links: [] });
  const [analysis, setAnalysis] = useState("");
  const [topicTrends, setTopicTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [query, setQuery] = useState("Donald Trump");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2025-03-13");
  const [subreddits, setSubreddits] = useState("Anarchism, Libertarian");

  useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    try {
      const testData = await fetchTimeSeries(
        "Donald Trump",
        "2023-01-01",
        "2025-03-01",
        "Anarchism"
      );

      const data = testData.data;

      if (data && data.length > 0) {
        handleSearch();
      } else {
        toast.error(
          "Database appears to be empty. Please initialize it first."
        );
      }
    } catch (err) {
      console.error("Error checking data:", err);
      toast.error(
        "Could not connect to database. Please check your backend connection."
      );
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setFilterOpen(false);

      const timeSeries = await fetchTimeSeries(
        query,
        startDate,
        endDate,
        subreddits
      );
      const communityDistribution = await fetchCommunityDistribution(
        query,
        startDate,
        endDate
      );
      const networkGraph = await fetchNetworkGraph(
        query,
        startDate,
        endDate,
        subreddits,
        100
      );
      const topicsData = await fetchTopicTrends(startDate, endDate, subreddits);

      const searchQuery = {
        query,
        start_date: startDate,
        end_date: endDate,
        subreddits: subreddits ? subreddits.split(",") : [],
      };

      const aiAnalysis = await fetchAIAnalysis(searchQuery);

      setTimeSeriesData(timeSeries.data);
      setCommunityData(communityDistribution);
      setNetworkData(networkGraph);
      setAnalysis(aiAnalysis.analysis);
      setTopicTrends(topicsData);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to fetch data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
      <div className="transition-all duration-300 px-80 max-md:px-0 max-xl:px-10 max-2xl:px-20">
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Social Media Analyzer
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Analyze trends across platforms with visualizations
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Analysis Filters</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Search Query
                      </label>
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Donald Trump"
                        className="h-12 w-full"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Start Date
                        </label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-12 w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          End Date
                        </label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="h-12 w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Subreddits (comma separated)
                      </label>
                      <Input
                        value={subreddits}
                        onChange={(e) => setSubreddits(e.target.value)}
                        placeholder="Subreddit1,Subreddit2"
                        className="h-12 w-full"
                      />
                    </div>

                    <Button
                      onClick={handleSearch}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />{" "}
                          Processing...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" /> Analyze Data
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleSearch}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" /> Analyze
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card className="mb-8 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border-none shadow-sm">
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                      <Search className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Query
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {query || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-violet-500 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Posts
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {timeSeriesData.reduce(
                          (sum, item) => sum + item.count,
                          0
                        ) || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                      <PieChart className="h-5 w-5 text-rose-500 dark:text-rose-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Communities
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {communityData.length || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                      <Network className="h-5 w-5 text-teal-500 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Connections
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {networkData.links.length || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="visualizations" className="w-full">
            <TabsList className="h-12 grid w-full grid-cols-2 mb-8">
              <TabsTrigger
                value="visualizations"
                className="h-10 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400"
              >
                Data Visualizations & Insights
              </TabsTrigger>
              <TabsTrigger
                value="analysis"
                className="h-10 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400"
              >
                AI Analysis & Chatbot
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visualizations" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
                  <CardHeader className="p-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="h-5 w-5" />
                      Posts Over Time
                    </CardTitle>
                    <CardDescription className="text-emerald-100">
                      Temporal analysis of post frequency
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    {timeSeriesData.length > 0 ? (
                      <div className="h-[300px]">
                        <TimeSeriesChart data={timeSeriesData} />
                      </div>
                    ) : (
                      <div className="flex justify-center items-center h-[300px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        {loading ? (
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                            <p>Loading data...</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <LineChart className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                            <p>No time series data available</p>
                            <p className="text-sm text-slate-400 mt-1">
                              Try adjusting your search parameters
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
                  <CardHeader className="p-5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Community Distribution
                    </CardTitle>
                    <CardDescription className="text-purple-100">
                      Breakdown of content across communities
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    {communityData.length > 0 ? (
                      <div className="h-[300px]">
                        <CommunityDistributionChart data={communityData} />
                      </div>
                    ) : (
                      <div className="flex justify-center items-center h-[300px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        {loading ? (
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                            <p>Loading data...</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <PieChart className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                            <p>No community data available</p>
                            <p className="text-sm text-slate-400 mt-1">
                              Try adjusting your search parameters
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <TopicTrends topicsData={topicTrends} />

              <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
                <CardHeader className="p-5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Network Graph
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    Visualizing relationship patterns and user connections
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  {networkData.nodes.length > 0 ? (
                    <div className="h-[600px]">
                      <NetworkGraph
                        nodes={networkData.nodes}
                        links={networkData.links}
                      />
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-[600px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      {loading ? (
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                          <p>Loading data...</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Network className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                          <p>No network data available</p>
                          <p className="text-sm text-slate-400 mt-1">
                            Try adjusting your search parameters
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-8">
              <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
                <CardHeader className="p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5" />
                    AI Analysis
                  </CardTitle>
                  <CardDescription className="text-amber-100">
                    AI-powered insights from your social media data
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <AIAnalysis
                    analysis={
                      analysis || "Please enter a query to get the analysis"
                    }
                  />
                </CardContent>
              </Card>

              <Chatbot />
            </TabsContent>
          </Tabs>

          <div className="mt-16 border-t border-slate-200 dark:border-slate-700 pt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <p>Built with ❤️ by Sameer Gupta</p>
          </div>
        </div>
      </div>
    </div>
  );
}
