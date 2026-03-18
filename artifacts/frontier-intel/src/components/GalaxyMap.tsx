import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { type SolarSystemThreat, SolarSystemThreatThreatLevel } from '@workspace/api-client-react';
import { seededRandom } from '@/lib/utils';

interface GalaxyMapProps {
  systems: SolarSystemThreat[];
  onSystemSelect: (systemId: string) => void;
  selectedSystemId: string | null;
}

type GalaxyNode = d3.SimulationNodeDatum &
  SolarSystemThreat & {
    id: string;
    r: number;
    x: number;
    y: number;
  };

const enableDemoFallback =
  String(import.meta.env.VITE_ENABLE_DEMO_FALLBACK || "").toLowerCase() === "true";

// Generate deterministic fake systems if API is empty
const generateFakeSystems = (): SolarSystemThreat[] => {
  return Array.from({ length: 60 }).map((_, i) => {
    const r = seededRandom(i * 10);
    let level: SolarSystemThreatThreatLevel = "UNKNOWN";
    if (r > 0.8) level = "HIGH";
    else if (r > 0.5) level = "MEDIUM";
    else if (r > 0.2) level = "LOW";

    return {
      solar_system_id: `SYS-${1000 + i}`,
      threat_level: level,
      kill_count_1h: Math.floor(r * 20),
      kill_count_24h: Math.floor(r * 100),
      jump_count_1h: Math.floor(seededRandom(i * 11) * 500),
      assembly_count: Math.floor(seededRandom(i * 12) * 5),
      intel_count: Math.floor(seededRandom(i * 13) * 10),
    };
  });
};

export function GalaxyMap({ systems, onSystemSelect, selectedSystemId }: GalaxyMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapData, setMapData] = useState<SolarSystemThreat[]>([]);

  useEffect(() => {
    if (systems && systems.length > 0) {
      setMapData(systems);
    } else if (enableDemoFallback) {
      setMapData(generateFakeSystems());
    } else {
      setMapData([]);
    }
  }, [systems]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || mapData.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear previous renders
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("background", "transparent");

    const g = svg.append("g");

    // Setup Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);

    // Initial transform to center
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));

    // Create Nodes data with deterministic initial positions based on ID
    const nodes: GalaxyNode[] = mapData.map((d, i) => {
      // Create a spiraling galaxy shape deterministically
      const angle = seededRandom(i * 100) * Math.PI * 2 * 4;
      const radius = seededRandom(i * 200) * (width / 2.5);
      return {
        ...d,
        id: d.solar_system_id,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        r: Math.max(3, 4 + (d.kill_count_1h / 5)) // Size based on activity
      };
    });

    // Color scale mapping
    const getColor = (level: string) => {
      switch (level) {
        case 'HIGH': return '#FF2A2A'; // Destructive
        case 'MEDIUM': return '#FFB800'; // Warning
        case 'LOW': return '#00FF66'; // Safe
        default: return '#334155'; // Muted
      }
    };

    const getGlow = (level: string) => {
      switch (level) {
        case 'HIGH': return 'drop-shadow(0 0 8px rgba(255,42,42,0.8))';
        case 'MEDIUM': return 'drop-shadow(0 0 8px rgba(255,184,0,0.8))';
        case 'LOW': return 'drop-shadow(0 0 8px rgba(0,255,102,0.6))';
        default: return 'none';
      }
    };

    // Draw Links (Faint connecting lines for aesthetic)
    const links = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) { // Connect close nodes
          links.push({ source: nodes[i], target: nodes[j] });
        }
      }
    }

    g.append("g")
      .attr("stroke", "hsl(var(--primary) / 0.15)")
      .attr("stroke-width", 1)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    // Draw Nodes
    const nodeElements = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onSystemSelect(d.id);
      })
      .on("mouseenter", function(event, d) {
        d3.select(this).select("circle")
          .attr("stroke", "hsl(var(--primary))")
          .attr("stroke-width", 2);
        
        // Show tooltip logic could go here, or just rely on the side panel
        d3.select(this).append("text")
          .attr("class", "hover-label")
          .attr("y", -15)
          .attr("text-anchor", "middle")
          .style("fill", "#fff")
          .style("font-family", "Orbitron, sans-serif")
          .style("font-size", "10px")
          .style("pointer-events", "none")
          .style("text-shadow", "0 0 4px #000")
          .text(d.solar_system_id);
      })
      .on("mouseleave", function(event, d) {
        d3.select(this).select("circle")
          .attr("stroke", d.id === selectedSystemId ? "hsl(var(--primary))" : "none")
          .attr("stroke-width", d.id === selectedSystemId ? 3 : 0);
        d3.select(this).selectAll(".hover-label").remove();
      });

    // Node circles
    nodeElements.append("circle")
      .attr("r", d => d.r)
      .attr("fill", d => getColor(d.threat_level))
      .style("filter", d => getGlow(d.threat_level))
      .attr("stroke", d => d.id === selectedSystemId ? "hsl(var(--primary))" : "none")
      .attr("stroke-width", d => d.id === selectedSystemId ? 3 : 0)
      .style("transition", "stroke 0.2s, stroke-width 0.2s");

    // Optional: Add inner pulse for HIGH threat
    nodeElements.filter(d => d.threat_level === 'HIGH')
      .append("circle")
      .attr("r", 2)
      .attr("fill", "#fff")
      .style("animation", "pulse 2s infinite");

    // Force simulation for slight drifting effect
    const simulation = d3.forceSimulation<GalaxyNode>(nodes)
      .force("collide", d3.forceCollide<GalaxyNode>().radius(d => d.r + 10).iterations(2))
      .alphaDecay(0) // Never fully stop, keep gently moving
      .velocityDecay(0.8)
      .on("tick", () => {
        // Very subtle movement
        nodeElements.attr("transform", d => {
          // add tiny random wobble
          d.x += (Math.random() - 0.5) * 0.1;
          d.y += (Math.random() - 0.5) * 0.1;
          return `translate(${d.x},${d.y})`;
        });
        
        // Update lines if they exist
        g.selectAll("line")
          .attr("x1", d => (d as any).source.x)
          .attr("y1", d => (d as any).source.y)
          .attr("x2", d => (d as any).target.x)
          .attr("y2", d => (d as any).target.y);
      });

    // Highlight selected node
    if (selectedSystemId) {
      const selectedNode = nodes.find(n => n.id === selectedSystemId);
      if (selectedNode) {
        // Add a large targeting reticle
        const reticle = g.append("g")
          .attr("class", "reticle")
          .attr("transform", `translate(${selectedNode.x},${selectedNode.y})`);
          
        reticle.append("circle")
          .attr("r", 25)
          .attr("fill", "none")
          .attr("stroke", "hsl(var(--primary))")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "4 4")
          .style("animation", "spin 10s linear infinite");
      }
    }

    return () => {
      simulation.stop();
    };
  }, [mapData, selectedSystemId, onSystemSelect]);

  return (
    <div ref={containerRef} className="w-full h-full absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes pulse { 0% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(2); } 100% { opacity: 0.5; transform: scale(1); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
      {/* Background Image behind the map */}
      <div 
        className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/space-bg.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <svg ref={svgRef} className="relative z-0" />
    </div>
  );
}
