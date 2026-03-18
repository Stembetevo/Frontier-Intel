/**
 * ZkLogin context — Google OAuth → ephemeral keypair → ZK proof → Sui testnet tx
 *
 * Flow:
 * 1. generateNonce()  — create ephemeral Ed25519 keypair + nonce
 * 2. Google OAuth     — user signs in, we get a JWT
 * 3. /api/zkproof     — backend calls Mysten prover with JWT + ephemeral pk → ZK proof
 * 4. buildZkLoginSignature() — combine proof + partial sig
 * 5. signAndExecuteTransaction() — submit intel report to Sui testnet
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  genAddressSeed,
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  jwtToAddress,
  decodeJwt,
} from "@mysten/sui/zklogin";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64, toBase64 } from "@mysten/sui/utils";

// ─── Constants ──────────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

// Mysten Labs public ZK proving service (testnet)
const PROVER_URL = "https://prover-dev.mystenlabs.com/v1";

function normalizeEnvId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return undefined;
  return trimmed;
}

// Our deployed Move contract on Sui testnet
// Will be set after deployment — kept in env var
const PACKAGE_ID = normalizeEnvId(import.meta.env.VITE_INTEL_PACKAGE_ID as string | undefined);
const REGISTRY_ID = normalizeEnvId(import.meta.env.VITE_INTEL_REGISTRY_ID as string | undefined);

// Sui testnet RPC
const TESTNET_RPC = "https://fullnode.testnet.sui.io:443";
const suiClient = new SuiJsonRpcClient({ url: TESTNET_RPC, network: "testnet" });

// Sui Clock object ID (shared, always 0x6)
const CLOCK_ID = "0x0000000000000000000000000000000000000000000000000000000000000006";

// Storage keys
const STORAGE_KEYS = {
  EPHEMERAL_KEYPAIR: "zklogin:ephemeralKeypair",
  RANDOMNESS: "zklogin:randomness",
  MAX_EPOCH: "zklogin:maxEpoch",
  JWT: "zklogin:jwt",
  ZK_PROOF: "zklogin:zkProof",
  USER_SALT: "zklogin:userSalt",
  NONCE: "zklogin:nonce",
} as const;

// Report type mapping → u8
export const REPORT_TYPE_MAP: Record<string, number> = {
  FLEET_SPOTTED: 0,
  AMBUSH: 1,
  TRADE_ROUTE: 2,
  SAFE: 4,
  // Legacy aliases kept for compatibility with older clients.
  GATE_CAMP: 1,
  ANOMALY: 2,
  STRUCTURE_HOSTILE: 3,
  CLEAR: 4,
  OTHER: 5,
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ZkLoginState {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  /** Google display name / email */
  userInfo: { name: string; email: string; picture: string } | null;
  /** True if we have a proof ready to sign txs */
  hasProof: boolean;
}

export interface ZkLoginActions {
  login: () => void;
  logout: () => void;
  submitIntelReport: (params: {
    systemId: string;
    message: string;
    reportType: string;
  }) => Promise<{ digest: string }>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ZkLoginContext = createContext<(ZkLoginState & ZkLoginActions) | undefined>(
  undefined
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function storeKeypair(kp: Ed25519Keypair) {
  sessionStorage.setItem(STORAGE_KEYS.EPHEMERAL_KEYPAIR, kp.getSecretKey());
}

function loadKeypair(): Ed25519Keypair | null {
  const raw = sessionStorage.getItem(STORAGE_KEYS.EPHEMERAL_KEYPAIR);
  if (!raw) return null;
  try {
    return Ed25519Keypair.fromSecretKey(raw);
  } catch {
    return null;
  }
}

// Derive a deterministic user salt from sub + a fixed project salt.
// For a production app you'd store this server-side per user.
function deriveUserSalt(sub: string): string {
  let hash = 0;
  for (let i = 0; i < sub.length; i++) {
    hash = (Math.imul(31, hash) + sub.charCodeAt(i)) | 0;
  }
  // Must be a large integer string for zklogin address derivation
  return String(BigInt(Math.abs(hash)) * 1000000000n + 123456789n);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ZkLoginProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ZkLoginState>({
    address: null,
    isConnected: false,
    isLoading: false,
    error: null,
    userInfo: null,
    hasProof: false,
  });

  const proofRef = useRef<object | null>(null);
  const maxEpochRef = useRef<number>(0);
  const userSaltRef = useRef<string>("");

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const jwt = sessionStorage.getItem(STORAGE_KEYS.JWT);
    const proofRaw = sessionStorage.getItem(STORAGE_KEYS.ZK_PROOF);
    const salt = sessionStorage.getItem(STORAGE_KEYS.USER_SALT);
    const maxEpoch = sessionStorage.getItem(STORAGE_KEYS.MAX_EPOCH);

    if (jwt && proofRaw && salt) {
      try {
        const proof = JSON.parse(proofRaw);
        const decoded = decodeJwt(jwt) as Record<string, unknown>;
        const sub = decoded.sub as string;
        const address = jwtToAddress(jwt, salt, false);
        proofRef.current = proof;
        userSaltRef.current = salt;
        maxEpochRef.current = maxEpoch ? Number(maxEpoch) : 0;

        setState({
          address,
          isConnected: true,
          isLoading: false,
          error: null,
          hasProof: true,
          userInfo: {
            name: (decoded.name as string) ?? (decoded.email as string) ?? "Pilot",
            email: (decoded.email as string) ?? "",
            picture: (decoded.picture as string) ?? "",
          },
        });
      } catch {
        // Corrupted session — clear it
        Object.values(STORAGE_KEYS).forEach((k) => sessionStorage.removeItem(k));
      }
    }
  }, []);

  // ── Handle Google OAuth callback (hash fragment) ──────────────────────────
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("id_token=")) return;

    const params = new URLSearchParams(hash.slice(1));
    const idToken = params.get("id_token");
    if (!idToken) return;

    // Clean URL
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    handleJwt(idToken);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleJwt(jwt: string) {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const decoded = decodeJwt(jwt) as Record<string, unknown>;
      const sub = decoded.sub as string;
      const salt = deriveUserSalt(sub);
      userSaltRef.current = salt;

      const kp = loadKeypair();
      if (!kp) throw new Error("Session expired — please log in again");

      const address = jwtToAddress(jwt, salt, false);
      const extPk = getExtendedEphemeralPublicKey(kp.getPublicKey());

      // Reuse the same maxEpoch/randomness that were used to build the login nonce.
      // If these drift, Groth16 verification fails on-chain.
      const storedMaxEpoch = sessionStorage.getItem(STORAGE_KEYS.MAX_EPOCH);
      const randomness = sessionStorage.getItem(STORAGE_KEYS.RANDOMNESS);
      if (!storedMaxEpoch || !randomness) {
        throw new Error("Missing zkLogin nonce context (maxEpoch/randomness). Please sign in again.");
      }
      const maxEpoch = Number(storedMaxEpoch);
      if (!Number.isFinite(maxEpoch) || maxEpoch <= 0) {
        throw new Error("Invalid zkLogin maxEpoch in session. Please sign in again.");
      }
      maxEpochRef.current = maxEpoch;

      // Call Mysten prover
      const proverResp = await fetch(PROVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jwt,
          extendedEphemeralPublicKey: extPk,
          maxEpoch,
          jwtRandomness: randomness,
          salt,
          keyClaimName: "sub",
        }),
      });

      if (!proverResp.ok) {
        const err = await proverResp.text();
        throw new Error(`ZK prover error: ${err}`);
      }

      const proof = await proverResp.json();
      proofRef.current = proof;

      sessionStorage.setItem(STORAGE_KEYS.JWT, jwt);
      sessionStorage.setItem(STORAGE_KEYS.ZK_PROOF, JSON.stringify(proof));
      sessionStorage.setItem(STORAGE_KEYS.USER_SALT, salt);
      sessionStorage.setItem(STORAGE_KEYS.MAX_EPOCH, String(maxEpoch));

      setState({
        address,
        isConnected: true,
        isLoading: false,
        error: null,
        hasProof: true,
        userInfo: {
          name: (decoded.name as string) ?? (decoded.email as string) ?? "Pilot",
          email: (decoded.email as string) ?? "",
          picture: (decoded.picture as string) ?? "",
        },
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "ZkLogin failed",
      }));
    }
  }

  // ── Login — start Google OAuth implicit flow ──────────────────────────────
  const login = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      // Generate fresh ephemeral keypair
      const kp = new Ed25519Keypair();
      storeKeypair(kp);

      // Fetch epoch
      const { epoch } = await suiClient.getLatestSuiSystemState();
      const maxEpoch = Number(epoch) + 2;
      maxEpochRef.current = maxEpoch;

      const randomness = generateRandomness();
      sessionStorage.setItem(STORAGE_KEYS.RANDOMNESS, String(randomness));

      const nonce = generateNonce(kp.getPublicKey(), maxEpoch, randomness);
      sessionStorage.setItem(STORAGE_KEYS.NONCE, nonce);
      sessionStorage.setItem(STORAGE_KEYS.MAX_EPOCH, String(maxEpoch));

      // Build Google OAuth URL (implicit / fragment flow)
      const redirectUri = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, "") + "/";
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        response_type: "id_token",
        scope: "openid email profile",
        redirect_uri: redirectUri,
        nonce,
      });

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to start login",
      }));
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach((k) => sessionStorage.removeItem(k));
    proofRef.current = null;
    setState({
      address: null,
      isConnected: false,
      isLoading: false,
      error: null,
      userInfo: null,
      hasProof: false,
    });
  }, []);

  // ── Submit intel report on-chain ─────────────────────────────────────────
  const submitIntelReport = useCallback(
    async ({
      systemId,
      message,
      reportType,
    }: {
      systemId: string;
      message: string;
      reportType: string;
    }): Promise<{ digest: string }> => {
      if (!state.address || !proofRef.current) {
        throw new Error("Not authenticated — please sign in first");
      }
      if (!systemId || typeof systemId !== "string") {
        throw new Error("Invalid system id");
      }
      if (!message || typeof message !== "string") {
        throw new Error("Message is required");
      }
      if (!reportType || typeof reportType !== "string") {
        throw new Error("Invalid report type");
      }
      if (!PACKAGE_ID || !REGISTRY_ID) {
        throw new Error(
          "Smart contract not yet deployed. Set VITE_INTEL_PACKAGE_ID and VITE_INTEL_REGISTRY_ID."
        );
      }

      const kp = loadKeypair();
      if (!kp) throw new Error("Session expired — please log in again");

      const gasCoins = await suiClient.getCoins({
        owner: state.address,
        limit: 1,
      });
      if (!gasCoins.data || gasCoins.data.length === 0) {
        throw new Error(
          "No valid gas coins found for the transaction. Fund your zkLogin address from the Sui testnet faucet, then retry."
        );
      }

      const reportTypeU8 = REPORT_TYPE_MAP[reportType] ?? REPORT_TYPE_MAP.OTHER;
      const normalizedSystemId = systemId.trim();
      const normalizedMessage = message.trim();

      const jwt = sessionStorage.getItem(STORAGE_KEYS.JWT);
      const userSalt = userSaltRef.current || sessionStorage.getItem(STORAGE_KEYS.USER_SALT) || "";
      if (!jwt || !userSalt) {
        throw new Error("Session proof incomplete — please sign in again");
      }

      const decodedJwt = decodeJwt(jwt) as { sub?: unknown; aud?: unknown };
      const sub = typeof decodedJwt.sub === "string" ? decodedJwt.sub : "";
      const aud = Array.isArray(decodedJwt.aud)
        ? decodedJwt.aud.find((v): v is string => typeof v === "string") || ""
        : typeof decodedJwt.aud === "string"
          ? decodedJwt.aud
          : "";
      if (!sub || !aud) {
        throw new Error("Invalid OAuth claims for zkLogin — please sign in again");
      }

      const addressSeed = genAddressSeed(BigInt(userSalt), "sub", sub, aud).toString();

      const tx = new Transaction();
      tx.setSender(state.address);
      tx.setGasBudget(10_000_000);

      tx.moveCall({
        target: `${PACKAGE_ID}::intel_report::submit_report`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.object(CLOCK_ID),
          tx.pure.vector("u8", Array.from(new TextEncoder().encode(normalizedSystemId))),
          tx.pure.vector("u8", Array.from(new TextEncoder().encode(normalizedMessage))),
          tx.pure.u8(reportTypeU8),
        ],
      });

      const { bytes, signature: partialSig } = await tx.sign({ client: suiClient, signer: kp });

      const proofInputs = {
        ...(proofRef.current as Record<string, unknown>),
        addressSeed,
      };

      const zkSig = getZkLoginSignature({
        inputs: proofInputs as Parameters<typeof getZkLoginSignature>[0]["inputs"],
        maxEpoch: maxEpochRef.current,
        userSignature: partialSig,
      });

      const result = await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature: zkSig,
        options: { showEffects: true },
      });

      const digest = result.digest;
      if (!digest) throw new Error("Transaction failed — no digest returned");

      return { digest };
    },
    [state.address]
  );

  return (
    <ZkLoginContext.Provider value={{ ...state, login, logout, submitIntelReport }}>
      {children}
    </ZkLoginContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useZkLogin() {
  const ctx = useContext(ZkLoginContext);
  if (!ctx) throw new Error("useZkLogin must be used inside ZkLoginProvider");
  return ctx;
}
