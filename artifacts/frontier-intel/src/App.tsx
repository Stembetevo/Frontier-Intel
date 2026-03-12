import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import "@mysten/dapp-kit/dist/index.css";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletBridgeProvider } from "@/contexts/WalletContext";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

const { networkConfig } = createNetworkConfig({
  mainnet: { url: getJsonRpcFullnodeUrl("mainnet"), network: "mainnet" as const },
  testnet: { url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" as const },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <WalletProvider
          autoConnect
          preferredWallets={["EVE Vault", "Sui Wallet", "Suiet"]}
          theme={null}
        >
          <WalletBridgeProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
          </WalletBridgeProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
