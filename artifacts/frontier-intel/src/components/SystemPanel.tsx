import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crosshair, Activity, Radar, FileText, Plus } from 'lucide-react';
import { useGetAssemblies, useGetIntelReports, type SolarSystemThreat } from '@workspace/api-client-react';
import { NeonButton, TacticalPanel, ThreatBadge } from './ui/SciFiUI';
import { format } from 'date-fns';
import { IntelModal } from './IntelModal';

interface SystemPanelProps {
  systemId: string | null;
  systemStats?: SolarSystemThreat;
  onClose: () => void;
}

export function SystemPanel({ systemId, systemStats, onClose }: SystemPanelProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'assemblies' | 'intel'>('stats');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Only fetch details if a system is selected
  const { data: assembliesData, isLoading: loadingAssemblies } = useGetAssemblies(
    { solar_system_id: systemId || undefined },
    { query: { enabled: !!systemId } }
  );

  const { data: intelData, isLoading: loadingIntel } = useGetIntelReports(
    { solar_system_id: systemId || undefined },
    { query: { enabled: !!systemId } }
  );

  if (!systemId) return null;

  const mockSystemStats = systemStats || {
    solar_system_id: systemId,
    threat_level: "UNKNOWN" as any,
    kill_count_1h: 0,
    kill_count_24h: 0,
    jump_count_1h: 0,
    assembly_count: 0,
    intel_count: 0
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-16 bottom-0 w-full md:w-[450px] z-30 flex flex-col pointer-events-auto"
        >
          <TacticalPanel className="h-full rounded-none border-y-0 border-r-0 flex flex-col !p-0">
            {/* Header */}
            <div className="p-5 border-b border-border/50 bg-secondary/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.2)_50%,transparent_75%,transparent_100%)] bg-[length:4px_4px] opacity-20" />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">SYSTEM IDENTIFIER</div>
                  <h2 className="text-3xl font-display font-black text-white tracking-wider text-glow-cyan">
                    {systemId}
                  </h2>
                </div>
                <button onClick={onClose} className="p-2 bg-black/20 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm font-mono text-muted-foreground">THREAT ASSESSMENT:</span>
                <ThreatBadge level={mockSystemStats.threat_level} className="text-sm px-3 py-1" />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/50 font-display text-sm tracking-widest bg-black/40">
              {(['stats', 'assemblies', 'intel'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 transition-colors relative ${activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary glow-cyan" />
                  )}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {activeTab === 'stats' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/40 border border-border p-4 rounded tactical-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Crosshair className="w-4 h-4" />
                        <span className="text-xs font-mono">KILLS (1H)</span>
                      </div>
                      <div className="text-3xl font-display text-destructive text-glow-red">{mockSystemStats.kill_count_1h}</div>
                    </div>
                    <div className="bg-black/40 border border-border p-4 rounded tactical-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Crosshair className="w-4 h-4" />
                        <span className="text-xs font-mono">KILLS (24H)</span>
                      </div>
                      <div className="text-3xl font-display text-white">{mockSystemStats.kill_count_24h}</div>
                    </div>
                    <div className="bg-black/40 border border-border p-4 rounded tactical-border col-span-2">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs font-mono">GATE JUMPS (1H)</span>
                      </div>
                      <div className="text-4xl font-display text-primary text-glow-cyan">{mockSystemStats.jump_count_1h}</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'assemblies' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono border-b border-border/50 pb-2">
                    <span className="flex items-center gap-2"><Radar className="w-4 h-4"/> SMART ASSEMBLIES</span>
                    <span>{assembliesData?.total || 0} DETECTED</span>
                  </div>
                  
                  {loadingAssemblies ? (
                    <div className="animate-pulse space-y-3">
                      {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded border border-white/10" />)}
                    </div>
                  ) : assembliesData?.assemblies.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground font-mono border border-dashed border-border/50 rounded">
                      NO STRUCTURES DETECTED
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assembliesData?.assemblies.map(a => (
                        <div key={a.assembly_id} className="bg-black/40 border border-border p-3 flex items-center justify-between hover:border-primary/50 transition-colors cursor-default group">
                          <div>
                            <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{a.name || a.assembly_type}</div>
                            <div className="text-xs text-muted-foreground font-mono mt-1">ID: {a.assembly_id.slice(0,8)}...</div>
                          </div>
                          <div className={`flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded bg-background border ${a.is_online ? 'text-safe border-safe/30' : 'text-muted-foreground border-border'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${a.is_online ? 'bg-safe glow-green' : 'bg-muted-foreground'}`} />
                            {a.is_online ? 'ONLINE' : 'OFFLINE'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'intel' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono border-b border-border/50 pb-2">
                    <span className="flex items-center gap-2"><FileText className="w-4 h-4"/> RECENT REPORTS</span>
                    <span>{intelData?.total || 0} LOGGED</span>
                  </div>
                  
                  {loadingIntel ? (
                    <div className="animate-pulse space-y-3">
                      {[1,2].map(i => <div key={i} className="h-24 bg-white/5 rounded border border-white/10" />)}
                    </div>
                  ) : intelData?.reports.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground font-mono border border-dashed border-border/50 rounded">
                      NO INTEL REPORTS FOR THIS SYSTEM
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {intelData?.reports.map(r => (
                        <div key={r.id} className="bg-black/40 border border-border p-4 relative">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                              {r.report_type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {format(new Date(r.created_at), 'HH:mm:ss · MMM dd')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 font-mono leading-relaxed">
                            "{r.message}"
                          </p>
                          <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-muted-foreground font-mono flex justify-between">
                            <span>REPORTER:</span>
                            <span className="text-primary/70">{r.wallet_address.slice(0,10)}...</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-border bg-black/60 backdrop-blur-md">
              <NeonButton onClick={() => setIsModalOpen(true)} className="w-full gap-2 py-3 text-lg">
                <Plus className="w-5 h-5" />
                SUBMIT INTEL REPORT
              </NeonButton>
            </div>
          </TacticalPanel>
        </motion.div>
      </AnimatePresence>

      <IntelModal 
        systemId={systemId} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
