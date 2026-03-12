import React from "react";
import { ConnectModal, useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { NeonButton } from "./ui/SciFiUI";
import { Shield, LogOut, Wallet } from "lucide-react";
import { useGetSolarSystems } from "@workspace/api-client-react";

export function Navbar() {
  const account = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { isError, isLoading } = useGetSolarSystems({
    query: { refetchInterval: 30000, retry: false },
  });

  const address = account?.address ?? null;
  const isConnected = !!account;

  return (
    <nav className="fixed top-0 w-full z-50 panel-glass border-t-0 border-x-0 rounded-none px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="relative flex items-center justify-center w-10 h-10">
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="Frontier Intel Logo"
            className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (sibling) sibling.classList.remove("hidden");
            }}
          />
          <Shield className="hidden w-8 h-8 text-primary absolute" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-glow-cyan tracking-widest flex items-center gap-2">
            FRONTIER <span className="text-white">INTEL</span>
          </h1>
          <div className="flex items-center text-xs text-muted-foreground tracking-widest gap-2">
            <span className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  isLoading
                    ? "bg-warning animate-pulse"
                    : isError
                    ? "bg-destructive"
                    : "bg-safe glow-green"
                }`}
              />
              GATEWAY UPLINK
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {isConnected ? (
          <div className="flex items-center gap-3 bg-secondary/50 border border-border px-3 py-1.5 rounded-sm tactical-border">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {account?.label ?? "Sui Wallet"}
              </span>
              <span className="text-sm font-mono text-primary font-bold">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
            <button
              onClick={() => disconnectWallet()}
              className="p-1.5 hover:bg-destructive/20 hover:text-destructive rounded text-muted-foreground transition-colors"
              title="Disconnect Wallet"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <ConnectModal
            trigger={
              <NeonButton className="gap-2">
                <Wallet className="w-4 h-4" />
                CONNECT VAULT
              </NeonButton>
            }
          />
        )}
      </div>
    </nav>
  );
}
