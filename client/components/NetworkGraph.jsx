import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NetworkGraphWithSummary = ({ nodes, links, summary }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();

    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (
      !nodes.length ||
      !links.length ||
      dimensions.width === 0 ||
      dimensions.height === 0
    )
      return;

    d3.select(svgRef.current).selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    const tooltip = d3
      .select(tooltipRef.current)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .attr(
        "class",
        "bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg text-sm"
      );

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const g = svg.append("g");

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    simulation.force(
      "collision",
      d3.forceCollide().radius((d) => Math.sqrt((d.weight || 5) * 2) + 10)
    );

    const communityColors = d3
      .scaleOrdinal()
      .domain([...new Set(nodes.map((node) => node.community))])
      .range(d3.schemeCategory10);

    const link = g
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => Math.sqrt(d.value || 1))
      .attr("stroke", "#cbd5e1");

    const node = g
      .append("g")
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .call(drag(simulation));

    node
      .append("circle")
      .attr("r", (d) => Math.sqrt((d.weight || 5) * 2))
      .attr("fill", (d) => communityColors(d.community || "default"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("mouseover", function (event, d) {
        tooltip
          .style("visibility", "visible")
          .html(
            `
            <div>
              <p class="font-medium text-slate-900 dark:text-white">${d.id}</p>
              <p class="text-slate-600 dark:text-slate-300">Community: ${
                d.community || "N/A"
              }</p>
              <p class="text-blue-600 dark:text-blue-400">Weight: ${
                d.weight || "N/A"
              }</p>
            </div>
          `
          )
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 30 + "px");

        d3.select(this)
          .attr("stroke", communityColors(d.community || "default"))
          .attr("stroke-width", 3);
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1.5);
      });

    const nodeLabels = node.append("g").attr("class", "node-label");

    nodeLabels
      .append("rect")
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("x", 12)
      .attr("y", -8)
      .attr("width", (d) => {
        const label = d.id.length > 10 ? d.id.substring(0, 10) + "..." : d.id;
        return label.length * 5.5 + 6;
      })
      .attr("height", 16)
      .attr("fill", "white")
      .attr("opacity", 0.7);

    nodeLabels
      .append("text")
      .text((d) => (d.id.length > 10 ? d.id.substring(0, 10) + "..." : d.id))
      .attr("font-size", "10px")
      .attr("dx", 15)
      .attr("dy", 4)
      .attr("fill", "#1e293b")
      .style("pointer-events", "none");

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#64748b");

    simulation.on("tick", () => {
      nodes.forEach((d) => {
        d.x = Math.max(d.r || 10, Math.min(width - (d.r || 10), d.x));
        d.y = Math.max(d.r || 10, Math.min(height - (d.r || 10), d.y));
      });

      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links, dimensions]);

  const formatSummary = () => {
    if (!summary) return <p>No summary available</p>;

    if (typeof summary === "string") {
      const paragraphs = summary.split("\n\n");

      return (
        <div className="space-y-4">
          {paragraphs.map((paragraph, index) => {
            const parts = paragraph.split(/(\*\*.*?\*\*|\*.*?\*)/g);

            return (
              <p
                key={index}
                className="text-sm text-slate-700 dark:text-slate-300"
              >
                {parts.map((part, i) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <span key={i} className="text-lg">
                        {part.slice(2, -2)}
                      </span>
                    );
                  } else if (part.startsWith("*") && part.endsWith("*")) {
                    return (
                      <span key={i} className="font-bold">
                        {part.slice(1, -1)}
                      </span>
                    );
                  } else {
                    return <span key={i}>{part}</span>;
                  }
                })}
              </p>
            );
          })}
        </div>
      );
    }

    if (typeof summary === "object") {
      return (
        <div className="space-y-4">
          {Object.entries(summary).map(([key, value]) => (
            <div
              key={key}
              className="border-b border-slate-200 dark:border-slate-700 pb-2"
            >
              <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/_/g, " ")
                  .trim()}
              </h4>
              <div className="mt-1">
                {typeof value === "object" ? (
                  <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300">
                    {Object.entries(value).map(([subKey, subValue]) => (
                      <li key={subKey}>
                        <span className="font-medium">{subKey}</span>:{" "}
                        {subValue.toString()}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {value.toString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <p>Summary format not recognized</p>;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col"
      style={{ height: "100%", minHeight: "500px" }}
    >
      <div className="relative flex-grow overflow-hidden">
        <svg ref={svgRef} className="w-full h-full rounded-md"></svg>
        <div ref={tooltipRef}></div>

        <div className="absolute bottom-2 right-2 z-10">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                className="shadow-lg bg-indigo-500 hover:bg-indigo-600 cursor-pointer"
              >
                View Network Summary
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Network Graph Summary</DialogTitle>
              </DialogHeader>
              <Card>
                <CardContent className="px-4">{formatSummary()}</CardContent>
              </Card>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default NetworkGraphWithSummary;
