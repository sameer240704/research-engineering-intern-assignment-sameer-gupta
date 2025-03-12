"use client";

import { useState, useEffect } from "react";
import TimeSeriesChart from "../components/TimeSeriesChart";
import CommunityDistributionChart from "../components/CommunityDistributionChart";
import NetworkGraph from "../components/NetworkGraph";
import AIAnalysis from "../components/AIAnalysis";
import Chatbot from "../components/Chatbot";
import {
  fetchTimeSeries,
  fetchCommunityDistribution,
  fetchNetworkGraph,
  fetchAIAnalysis,
  initDatabase,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  RefreshCw,
  BarChart3,
  Filter,
  Database,
  AlertCircle,
  LineChart,
  PieChart,
  Network,
  BrainCircuit,
  MessageSquare,
} from "lucide-react";

export default function Home() {
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [communityData, setCommunityData] = useState([]);
  const [networkData, setNetworkData] = useState({ nodes: [], links: [] });
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [initializingDb, setInitializingDb] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [query, setQuery] = useState("anarchism");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2025-03-13");
  const [subreddits, setSubreddits] = useState("Anarchism,Libertarian");

  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    checkData();

    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsCollapsed(false);
      } else {
        setIsCollapsed(true);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const checkData = async () => {
    try {
      const testData = await fetchTimeSeries(
        "anarchism",
        "2024-01-01",
        "2025-03-01",
        "Anarchism"
      );

      const data = testData.data;

      if (data && data.length > 0) {
        setDbInitialized(true);
        handleSearch();
      } else {
        setError("Database appears to be empty. Please initialize it first.");
      }
    } catch (err) {
      console.error("Error checking data:", err);
      setError(
        "Could not connect to database. Please check your backend connection."
      );
    }
  };

  const handleInitDatabase = async () => {
    try {
      setInitializingDb(true);
      setError(null);

      const result = await initDatabase();

      if (result && result.status === "success") {
        setDbInitialized(true);
        setError(null);

        handleSearch();
      } else {
        setError("Failed to initialize database. Check backend logs.");
      }
    } catch (err) {
      console.error("Error initializing database:", err);
      setError("Failed to initialize database. Is your backend running?");
    } finally {
      setInitializingDb(false);
    }
  };

  const handleSearch = async () => {
    if (!dbInitialized) {
      setError("Please initialize the database first.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
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

      const searchQuery = {
        query,
        start_date: startDate,
        end_date: endDate,
        subreddits: subreddits ? subreddits.split(",") : [],
      };

      const aiAnalysis = await fetchAIAnalysis(searchQuery);

      console.log(timeSeries);

      setTimeSeriesData(timeSeries.data);
      setCommunityData(communityDistribution);
      setNetworkData(networkGraph);
      setAnalysis(aiAnalysis.analysis);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
      <div
        className={`fixed left-0 top-0 z-40 h-full w-64 bg-white dark:bg-slate-900 shadow-lg transform transition-transform duration-300 ease-in-out ${
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        } md:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              SocialInsight
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Advanced Analytics Platform
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                    Dashboard
                  </h2>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Overview
                    </Button>
                    <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Filter className="mr-2 h-4 w-4" />
                          Filters
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                    {!dbInitialized && (
                      <Button
                        onClick={handleInitDatabase}
                        variant="ghost"
                        className="w-full justify-start text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                        disabled={initializingDb}
                      >
                        <Database className="mr-2 h-4 w-4" />
                        {initializingDb ? "Initializing..." : "Initialize DB"}
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="mb-2 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                    Visualizations
                  </h2>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <LineChart className="mr-2 h-4 w-4" />
                      Time Series
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <PieChart className="mr-2 h-4 w-4" />
                      Community Data
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Network className="mr-2 h-4 w-4" />
                      Network Graph
                    </Button>
                  </div>
                </div>

                <div>
                  <h2 className="mb-2 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                    AI Features
                  </h2>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <BrainCircuit className="mr-2 h-4 w-4" />
                      AI Analysis
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Interactive Chat
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center text-white font-medium">
                AI
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Social Analysis
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  v1.0.0
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Toggle */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-full bg-white dark:bg-slate-900 shadow-md"
        >
          <Filter className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="md:pl-64 transition-all duration-300">
        <div className="p-4 sm:p-6 md:p-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Social Media Analysis
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Analyze trends across platforms with live visualizations
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
                        placeholder="Enter search term"
                        className="w-full"
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
                          className="w-full"
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
                          className="w-full"
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
                        className="w-full"
                      />
                    </div>

                    <Button
                      onClick={handleSearch}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={loading || !dbInitialized}
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
                disabled={loading || !dbInitialized}
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Processing...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" /> Analyze
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Database Initialization Warning */}
          {!dbInitialized && (
            <div className="mb-8 rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-800">
                  Database Not Initialized
                </h3>
                <p className="text-amber-700 text-sm mt-1">
                  You need to initialize the database before you can analyze
                  data.
                </p>
                <Button
                  onClick={handleInitDatabase}
                  className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={initializingDb}
                >
                  {initializingDb ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Initializing...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" /> Initialize Database
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-8 rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800">Error</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Analysis Summary Card */}
          <Card className="mb-8 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border-none shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

          {/* Main Content Tabs */}
          <Tabs defaultValue="visualizations" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger
                value="visualizations"
                className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400"
              >
                Data Visualizations
              </TabsTrigger>
              <TabsTrigger
                value="analysis"
                className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400"
              >
                AI Analysis & Chat
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
                      analysis ||
                      "AI analysis is currently disabled. Enable it in the code by uncommenting the related sections."
                    }
                  />
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
                <CardHeader className="p-5 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Interactive Chatbot
                  </CardTitle>
                  <CardDescription className="text-rose-100">
                    Ask questions about the analyzed data
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <Chatbot />
                </CardContent>
              </Card>
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
