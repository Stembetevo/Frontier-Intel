import React, { createContext, useContext } from "react";
import {
  useCurrentAccount,
  useDisconnectWallet,
  useSuiClientQuery,
  useSuiClient,
} from "@mysten/dapp-kit";

/**
 * EVE Frontier world package ID on Sui mainnet.
 * Used to filter owned objects by EVE game types.
 */
export const EVE_WORLD_PACKAGE_ID =
  "0x2ff3e06b96eb830bdcffbc6cae9b8fe43f005c3b94cef05d9ec23057df16f107";

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  walletName: string | null;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletBridgeProvider({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();

  const address = account?.address ?? null;
  const isConnected = !!account;
  const walletName = account?.label ?? null;

  return (
    <WalletContext.Provider value={{ address, isConnected, walletName, disconnect: disconnectWallet }}>
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

/**
 * Hook to query objects owned by the connected wallet on Sui mainnet.
 * Optionally filter by a Move struct type (e.g. EVE character type).
 *
 * Example:
 *   const { data } = useOwnedObjects();
 *   const { data } = useOwnedObjects(`${EVE_WORLD_PACKAGE_ID}::character::Character`);
 */
export function useOwnedObjects(structType?: string) {
  const account = useCurrentAccount();
  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address ?? "",
      filter: structType ? { StructType: structType } : undefined,
      options: { showType: true, showContent: true, showDisplay: true },
    },
    { enabled: !!account?.address }
  );
}

/**
 * Hook to get the SUI balance of the connected wallet.
 */
export function useWalletBalance() {
  const account = useCurrentAccount();
  return useSuiClientQuery(
    "getBalance",
    { owner: account?.address ?? "" },
    { enabled: !!account?.address }
  );
}

/**
 * Re-export low-level Sui client for custom queries.
 * Use this when you need queries not covered by the hooks above.
 *
 * Example:
 *   const client = useSuiClient();
 *   const events = await client.queryEvents({ query: { MoveModule: { package: EVE_WORLD_PACKAGE_ID, module: 'killmail' } } });
 */
export { useSuiClient, useSuiClientQuery };
