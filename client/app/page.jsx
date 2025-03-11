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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RefreshCw } from "lucide-react";

export default function Home() {
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [communityData, setCommunityData] = useState([]);
  const [networkData, setNetworkData] = useState({ nodes: [], links: [] });
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [initializingDb, setInitializingDb] = useState(false);

  const [query, setQuery] = useState("anarchism");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-12-31");
  const [subreddits, setSubreddits] = useState("Anarchism,Libertarian");

  useEffect(() => {
    // We'll check if we need to initialize the database first
    checkData();
  }, []);

  const checkData = async () => {
    try {
      // Try to fetch some data to see if the database has content
      const testData = await fetchTimeSeries("test", null, null, null);
      if (testData && testData.length > 0) {
        setDbInitialized(true);
        handleSearch(); // Only search if the DB has data
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
        // After initialization, try to fetch data
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

      setTimeSeriesData(timeSeries);
      setCommunityData(communityDistribution);
      setNetworkData(networkGraph);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <Card className="mb-8 border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-lg">
          <CardTitle className="text-3xl font-bold">
            Social Media Analysis Dashboard
          </CardTitle>
          <p className="text-slate-100 opacity-90">
            Analyze and visualize trends across social platforms
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {!dbInitialized && (
            <div className="mb-4 p-4 bg-amber-100 border-l-4 border-amber-500 text-amber-700">
              <p className="font-medium">Database not initialized</p>
              <p className="text-sm">
                You need to initialize the database before you can analyze data.
              </p>
              <Button
                onClick={handleInitDatabase}
                className="mt-2 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={initializingDb}
              >
                {initializingDb ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Initializing...
                  </>
                ) : (
                  "Initialize Database"
                )}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Query
              </label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter search term"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subreddits (comma separated)
              </label>
              <Input
                value={subreddits}
                onChange={(e) => setSubreddits(e.target.value)}
                placeholder="Subreddit1,Subreddit2"
                className="w-full"
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            disabled={loading || !dbInitialized}
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" /> Analyze Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="mb-8 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>{error}</p>
        </div>
      )}

      <Tabs defaultValue="visualizations" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="visualizations">Data Visualizations</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis & Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="visualizations" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-md hover:shadow-lg transition-shadow border-0">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
                <CardTitle>Posts Over Time</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {timeSeriesData.length > 0 ? (
                  <TimeSeriesChart data={timeSeriesData} />
                ) : (
                  <div className="flex justify-center items-center h-64 text-gray-500">
                    {loading
                      ? "Loading data..."
                      : "No time series data available"}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow border-0">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-lg">
                <CardTitle>Community Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {communityData.length > 0 ? (
                  <CommunityDistributionChart data={communityData} />
                ) : (
                  <div className="flex justify-center items-center h-64 text-gray-500">
                    {loading
                      ? "Loading data..."
                      : "No community data available"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-md hover:shadow-lg transition-shadow border-0">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-t-lg">
              <CardTitle>Network Graph</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {networkData.nodes.length > 0 ? (
                <NetworkGraph
                  nodes={networkData.nodes}
                  links={networkData.links}
                />
              ) : (
                <div className="flex justify-center items-center h-64 text-gray-500">
                  {loading ? "Loading data..." : "No network data available"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-8">
          <Card className="shadow-md hover:shadow-lg transition-shadow border-0">
            <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <AIAnalysis
                analysis={
                  analysis ||
                  "AI analysis is currently disabled. Enable it in the code by uncommenting the related sections."
                }
              />
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow border-0">
            <CardHeader className="bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-t-lg">
              <CardTitle>Interactive Chatbot</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Chatbot />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
