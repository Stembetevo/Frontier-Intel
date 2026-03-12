import React from 'react';
import { TacticalPanel, ThreatBadge } from './ui/SciFiUI';

export function Legend() {
  return (
    <TacticalPanel className="fixed bottom-6 left-6 z-10 w-64">
      <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-primary animate-pulse rounded-full" />
        SYSTEM THREAT LEGEND
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive shadow-[0_0_8px_rgba(255,42,42,0.8)]" />
            <span className="text-xs text-muted-foreground">High Danger</span>
          </div>
          <ThreatBadge level="HIGH" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning shadow-[0_0_8px_rgba(255,184,0,0.8)]" />
            <span className="text-xs text-muted-foreground">Active Conflict</span>
          </div>
          <ThreatBadge level="MEDIUM" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-safe shadow-[0_0_8px_rgba(0,255,102,0.8)]" />
            <span className="text-xs text-muted-foreground">Safe / Patrolled</span>
          </div>
          <ThreatBadge level="LOW" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <span className="text-xs text-muted-foreground">No Recent Data</span>
          </div>
          <ThreatBadge level="UNKNOWN" />
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-border/50 text-[10px] text-muted-foreground/60 text-center font-mono">
        DATA SOURCED VIA EVE FRONTIER GATEWAY
      </div>
    </TacticalPanel>
  );
}
