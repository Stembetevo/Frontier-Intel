import React, { createContext, useContext, useState, useEffect } from 'react';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('eve_vault_address');
    if (saved) setAddress(saved);
  }, []);

  const connect = () => {
    // Simulated connection for now as per implementation notes
    const fakeAddress = "0x" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
    const userAddress = prompt("Enter EVE Vault Wallet Address:", fakeAddress);
    if (userAddress) {
      setAddress(userAddress);
      localStorage.setItem('eve_vault_address', userAddress);
    }
  };

  const disconnect = () => {
    setAddress(null);
    localStorage.removeItem('eve_vault_address');
  };

  return (
    <WalletContext.Provider value={{ 
      address, 
      isConnected: !!address, 
      connect, 
      disconnect 
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
