"use client";

import { useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";

const NetworkGraph = ({ nodes, links }) => {
  const graphRef = useRef(null);
  const [networkInstance, setNetworkInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [graphStats, setGraphStats] = useState({
    nodes: 0,
    edges: 0,
  });

  useEffect(() => {
    if (!graphRef.current || !nodes || !links || nodes.length === 0) {
      setLoading(true);
      return;
    }

    setLoading(true);

    try {
      // Transform nodes to add more visual properties
      const enhancedNodes = nodes.map((node) => ({
        id: node.id,
        label: node.id, // Use the node ID as the label
        group: node.group || 0, // Default to group 0 if not provided
        type: node.type || "author", // Default to "author" if not provided
        community: node.community || 0, // Default to community 0 if not provided
        size: 15, // Fixed size for all nodes
        font: { size: 14 },
        color: {
          background: getNodeColor(node.community || 0), // Use community for color
          border: "#ffffff",
          highlight: { background: "#ff8800", border: "#ffffff" },
        },
      }));

      // Transform edges to have better visual properties
      const enhancedEdges = links.map((edge) => ({
        from: edge.source,
        to: edge.target,
        value: edge.value || 1, // Default to 1 if not provided
        width: 1 + (edge.value || 1) * 3, // Scale width based on value
        color: { color: "rgba(180, 180, 180, 0.7)", highlight: "#ff8800" },
        smooth: { type: "continuous" },
      }));

      // Create datasets
      const nodesDataset = new DataSet(enhancedNodes);
      const edgesDataset = new DataSet(enhancedEdges);

      const data = {
        nodes: nodesDataset,
        edges: edgesDataset,
      };

      // Network visualization options
      const options = {
        nodes: {
          shape: "dot",
          borderWidth: 2,
          shadow: true,
        },
        edges: {
          width: 2,
          shadow: true,
        },
        interaction: {
          hover: true,
          navigationButtons: true,
          keyboard: true,
          tooltipDelay: 300,
        },
        physics: {
          stabilization: {
            iterations: 200,
          },
          barnesHut: {
            gravitationalConstant: -2000,
            springConstant: 0.04,
            springLength: 95,
          },
        },
      };

      // Create network
      const network = new Network(graphRef.current, data, options);

      // Set network instance to state for potential later use
      setNetworkInstance(network);

      // Update graph stats
      setGraphStats({
        nodes: enhancedNodes.length,
        edges: enhancedEdges.length,
      });

      // Add event listeners
      network.on("stabilizationProgress", function (params) {
        // You could implement a progress bar here
      });

      network.on("stabilizationIterationsDone", function () {
        setLoading(false);
      });

      // Clean up on unmount
      return () => {
        if (network) {
          network.destroy();
        }
      };
    } catch (error) {
      console.error("Error creating network graph:", error);
      setLoading(false);
    }
  }, [nodes, links]);

  // Function to generate colors based on community number
  const getNodeColor = (community) => {
    const colors = [
      "#4285F4", // Google Blue
      "#EA4335", // Google Red
      "#FBBC05", // Google Yellow
      "#34A853", // Google Green
      "#7B1FA2", // Purple
      "#0097A7", // Teal
      "#FB8C00", // Orange
      "#795548", // Brown
    ];

    return colors[community % colors.length];
  };

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-700">Building network graph...</p>
          </div>
        </div>
      )}

      {nodes && nodes.length > 0 ? (
        <>
          <div className="absolute top-2 right-2 z-10 bg-white p-2 rounded shadow-md text-xs text-gray-600">
            Nodes: {graphStats.nodes} | Connections: {graphStats.edges}
          </div>
          <div
            ref={graphRef}
            className="border rounded-lg bg-white"
            style={{ height: "500px", width: "100%" }}
          />
        </>
      ) : (
        <div className="flex justify-center items-center h-64 text-gray-500">
          No network data available
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;
