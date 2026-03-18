import React, { useState } from 'react';
import { type SolarSystemsResponse, useGetSolarSystems } from '@workspace/api-client-react';
import { Navbar } from '@/components/Navbar';
import { GalaxyMap } from '@/components/GalaxyMap';
import { SystemPanel } from '@/components/SystemPanel';
import { Legend } from '@/components/Legend';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  
  // Polling every 30 seconds for live updates
  const { data: systemsResponseRaw, isLoading } = useGetSolarSystems({
    query: {
      queryKey: ['/api/systems'],
      refetchInterval: 30000,
    }
  });

  const systemsResponse = systemsResponseRaw as SolarSystemsResponse | undefined;
  const systems = systemsResponse?.systems ?? [];

  const selectedSystemStats = systems.find(s => s.solar_system_id === selectedSystemId);
  const showNoTelemetryHint = !isLoading && systems.length === 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background text-foreground">
      <Navbar />
      
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0">
        <GalaxyMap 
          systems={systems} 
          onSystemSelect={setSelectedSystemId}
          selectedSystemId={selectedSystemId}
        />
      </div>

      {/* Loading Overlay */}
      {isLoading && systems.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <h2 className="text-xl font-display font-bold tracking-widest text-primary text-glow-cyan">
            INITIALIZING GALAXY MAP...
          </h2>
          <p className="text-muted-foreground font-mono mt-2 text-sm">
            ESTABLISHING UPLINK TO EVE FRONTIER GATEWAY
          </p>
        </div>
      )}

      {showNoTelemetryHint && (
        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-md border border-primary/40 bg-background/80 px-4 py-2 text-center backdrop-blur">
          <p className="font-mono text-xs text-primary">NO LIVE TELEMETRY YET</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Trigger /api/telemetry/sync on the backend to ingest Stillness events.
          </p>
        </div>
      )}

      {/* Floating UI Elements */}
      <Legend />

      {/* Side Panel Overlay */}
      <SystemPanel 
        systemId={selectedSystemId} 
        systemStats={selectedSystemStats}
        onClose={() => setSelectedSystemId(null)} 
      />
      
      {/* Scanline overlay for aesthetic */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-5" 
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)' }}>
      </div>
    </div>
  );
}
