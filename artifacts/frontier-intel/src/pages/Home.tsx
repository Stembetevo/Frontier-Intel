import React, { useState } from 'react';
import { useGetSolarSystems } from '@workspace/api-client-react';
import { Navbar } from '@/components/Navbar';
import { GalaxyMap } from '@/components/GalaxyMap';
import { SystemPanel } from '@/components/SystemPanel';
import { Legend } from '@/components/Legend';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  
  // Polling every 30 seconds for live updates
  const { data: systemsResponse, isLoading } = useGetSolarSystems({
    query: {
      refetchInterval: 30000,
    }
  });

  const selectedSystemStats = systemsResponse?.systems.find(s => s.solar_system_id === selectedSystemId);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background text-foreground">
      <Navbar />
      
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0">
        <GalaxyMap 
          systems={systemsResponse?.systems || []} 
          onSystemSelect={setSelectedSystemId}
          selectedSystemId={selectedSystemId}
        />
      </div>

      {/* Loading Overlay */}
      {isLoading && (!systemsResponse?.systems || systemsResponse.systems.length === 0) && (
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
