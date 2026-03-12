import React, { createContext, useContext } from "react";
import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletBridgeProvider({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();

  const address = account?.address ?? null;
  const isConnected = !!account;

  function disconnect() {
    disconnectWallet();
  }

  return (
    <WalletContext.Provider value={{ address, isConnected, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletBridgeProvider");
  }
  return context;
}
