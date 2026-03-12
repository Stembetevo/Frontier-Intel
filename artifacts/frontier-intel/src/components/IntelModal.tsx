import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/contexts/WalletContext';
import { ConnectModal } from '@mysten/dapp-kit';
import { NeonButton, TacticalPanel } from './ui/SciFiUI';
import { useCreateIntelReport, CreateIntelReportRequestReportType } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Send, AlertTriangle } from 'lucide-react';

interface IntelModalProps {
  systemId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function IntelModal({ systemId, isOpen, onClose }: IntelModalProps) {
  const { address, isConnected } = useWallet();
  const [message, setMessage] = useState('');
  const [reportType, setReportType] = useState<CreateIntelReportRequestReportType>(CreateIntelReportRequestReportType.FLEET_SPOTTED);
  
  const queryClient = useQueryClient();
  const createMutation = useCreateIntelReport({
    mutation: {
      onSuccess: () => {
        // Invalidate both lists and specific system intel
        queryClient.invalidateQueries({ queryKey: ['/api/intel'] });
        setMessage('');
        onClose();
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    createMutation.mutate({
      data: {
        solar_system_id: systemId,
        message,
        report_type: reportType,
        wallet_address: address
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md"
          >
            <TacticalPanel className="border-primary/50 shadow-[0_0_30px_rgba(0,240,255,0.15)] p-0">
              <div className="bg-primary/10 border-b border-primary/30 p-4 flex justify-between items-center">
                <h2 className="text-lg text-primary font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  SUBMIT INTEL REPORT
                </h2>
                <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 tracking-widest">TARGET SYSTEM</label>
                  <div className="text-lg font-mono text-white">{systemId}</div>
                </div>

                {!isConnected ? (
                  <div className="bg-warning/10 border border-warning/30 p-4 rounded text-center space-y-3">
                    <p className="text-sm text-warning font-mono">EVE Vault connection required to sign intel reports.</p>
                    <ConnectModal
                      trigger={
                        <NeonButton type="button" variant="outline" className="w-full text-warning border-warning hover:bg-warning/20 hover:text-warning">
                          CONNECT VAULT
                        </NeonButton>
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1 tracking-widest">REPORT TYPE</label>
                      <select 
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as CreateIntelReportRequestReportType)}
                        className="w-full bg-input border border-border text-white p-2.5 rounded font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                      >
                        {Object.values(CreateIntelReportRequestReportType).map(type => (
                          <option key={type} value={type}>{type.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1 tracking-widest">OBSERVATION DETAILS</label>
                      <textarea 
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Enter coordinates, ship types, or activity details..."
                        className="w-full bg-input border border-border text-white p-3 rounded font-mono text-sm h-32 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                      />
                    </div>

                    <div className="text-xs text-muted-foreground font-mono bg-black/20 p-2 rounded border border-white/5 break-all">
                      Signing as: <span className="text-primary">{address}</span>
                    </div>

                    <NeonButton 
                      type="submit" 
                      className="w-full gap-2 mt-4" 
                      isLoading={createMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                      TRANSMIT INTEL
                    </NeonButton>
                  </>
                )}
              </form>
            </TacticalPanel>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
