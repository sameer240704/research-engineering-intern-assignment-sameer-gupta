import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const NetworkGraph = ({ nodes, links }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!nodes.length || !links.length) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const container = svgRef.current.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

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

    node
      .append("text")
      .text((d) => (d.id.length > 10 ? d.id.substring(0, 10) + "..." : d.id))
      .attr("font-size", "10px")
      .attr("dx", 12)
      .attr("dy", 4)
      .attr("fill", "#64748b")
      .style("pointer-events", "none");

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#64748b")
      .text("Network Connections");

    simulation.on("tick", () => {
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

    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      svg
        .attr("width", newWidth)
        .attr("height", newHeight)
        .attr("viewBox", [0, 0, newWidth, newHeight]);

      simulation
        .force("center", d3.forceCenter(newWidth / 2, newHeight / 2))
        .force("x", d3.forceX(newWidth / 2).strength(0.1))
        .force("y", d3.forceY(newHeight / 2).strength(0.1))
        .alpha(0.3)
        .restart();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      simulation.stop();
      window.removeEventListener("resize", handleResize);
    };
  }, [nodes, links]);

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full"></svg>
      <div ref={tooltipRef}></div>
    </div>
  );
};

export default NetworkGraph;
