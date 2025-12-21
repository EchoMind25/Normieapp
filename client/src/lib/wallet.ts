import { PublicKey } from "@solana/web3.js";
import { apiRequest } from "./queryClient";

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: PublicKey }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array }>;
      request?: (args: { method: string; params: any }) => Promise<any>;
      publicKey?: PublicKey;
      isConnected?: boolean;
    };
    solflare?: {
      isSolflare?: boolean;
      connect: () => Promise<{ publicKey: PublicKey }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array }>;
      publicKey?: PublicKey;
      isConnected?: boolean;
    };
  }
}

export type WalletProvider = "phantom" | "solflare";

export function getAvailableWallets(): WalletProvider[] {
  const wallets: WalletProvider[] = [];
  if (window.solana?.isPhantom) wallets.push("phantom");
  if (window.solflare?.isSolflare) wallets.push("solflare");
  return wallets;
}

export function getWallet(provider: WalletProvider) {
  if (provider === "phantom" && window.solana?.isPhantom) {
    return window.solana;
  }
  if (provider === "solflare" && window.solflare?.isSolflare) {
    return window.solflare;
  }
  return null;
}

export async function connectWallet(provider: WalletProvider): Promise<string | null> {
  const wallet = getWallet(provider);
  if (!wallet) {
    window.open(
      provider === "phantom" 
        ? "https://phantom.app/" 
        : "https://solflare.com/",
      "_blank"
    );
    return null;
  }

  try {
    const response = await wallet.connect();
    return response.publicKey.toBase58();
  } catch (error) {
    console.error("Wallet connect error:", error);
    return null;
  }
}

export async function disconnectWallet(provider: WalletProvider): Promise<void> {
  const wallet = getWallet(provider);
  if (wallet) {
    try {
      await wallet.disconnect();
    } catch (error) {
      console.error("Wallet disconnect error:", error);
    }
  }
}

export async function signMessage(
  provider: WalletProvider,
  message: string
): Promise<{ signature: string; publicKey: string } | null> {
  const wallet = getWallet(provider);
  if (!wallet || !wallet.publicKey) {
    console.error("Sign message error: wallet not connected or no publicKey");
    return null;
  }

  try {
    const messageBytes = new TextEncoder().encode(message);
    let signature: Uint8Array;
    
    // Use Phantom's request method if available (preferred for mobile)
    const phantomWallet = provider === "phantom" ? window.solana : null;
    if (phantomWallet?.request) {
      const response = await phantomWallet.request({
        method: "signMessage",
        params: {
          message: messageBytes,
          display: "utf8",
        },
      });
      signature = response.signature;
    } else {
      const result = await wallet.signMessage(messageBytes, "utf8");
      signature = result.signature;
    }
    
    return {
      signature: Buffer.from(signature).toString("base64"),
      publicKey: Buffer.from(wallet.publicKey.toBytes()).toString("base64"),
    };
  } catch (error: any) {
    console.error("Sign message error:", error?.message || error);
    return null;
  }
}

export async function authenticateWithWallet(
  provider: WalletProvider
): Promise<{ user: any; token: string } | null> {
  try {
    console.log(`[Wallet] Connecting ${provider}...`);
    const walletAddress = await connectWallet(provider);
    if (!walletAddress) {
      console.error("[Wallet] Failed to get wallet address");
      return null;
    }
    console.log(`[Wallet] Connected: ${walletAddress}`);

    console.log("[Wallet] Requesting challenge...");
    const challengeRes = await apiRequest("POST", "/api/auth/wallet/challenge", {
      walletAddress,
    });
    if (!challengeRes.ok) {
      const error = await challengeRes.text();
      console.error("[Wallet] Challenge request failed:", error);
      return null;
    }
    const { challenge } = await challengeRes.json();
    console.log("[Wallet] Challenge received:", challenge?.substring(0, 20) + "...");

    console.log("[Wallet] Signing message...");
    const signResult = await signMessage(provider, challenge);
    if (!signResult) {
      console.error("[Wallet] Message signing failed or cancelled");
      return null;
    }
    console.log("[Wallet] Message signed successfully");

    console.log("[Wallet] Verifying signature...");
    const verifyRes = await apiRequest("POST", "/api/auth/wallet/verify", {
      walletAddress,
      challenge,
      signature: signResult.signature,
      publicKey: signResult.publicKey,
    });

    if (!verifyRes.ok) {
      const error = await verifyRes.text();
      console.error("[Wallet] Verification failed:", error);
      throw new Error(`Verification failed: ${error}`);
    }

    console.log("[Wallet] Authentication successful!");
    return verifyRes.json();
  } catch (error) {
    console.error("[Wallet] Authentication error:", error);
    return null;
  }
}

export async function linkWalletToAccount(
  provider: WalletProvider
): Promise<{ success: boolean; walletAddress: string } | null> {
  try {
    console.log(`[Wallet] Linking ${provider} to existing account...`);
    const walletAddress = await connectWallet(provider);
    if (!walletAddress) {
      console.error("[Wallet] Failed to get wallet address for linking");
      return null;
    }
    console.log(`[Wallet] Connected for linking: ${walletAddress}`);

    console.log("[Wallet] Requesting link challenge...");
    const challengeRes = await apiRequest("POST", "/api/auth/wallet/link-challenge", {
      walletAddress,
    });
    if (!challengeRes.ok) {
      const error = await challengeRes.text();
      console.error("[Wallet] Link challenge request failed:", error);
      throw new Error(error);
    }
    const { challenge } = await challengeRes.json();
    console.log("[Wallet] Link challenge received");

    console.log("[Wallet] Signing link message...");
    const signResult = await signMessage(provider, challenge);
    if (!signResult) {
      console.error("[Wallet] Link message signing failed or cancelled");
      return null;
    }
    console.log("[Wallet] Link message signed");

    console.log("[Wallet] Verifying link...");
    const verifyRes = await apiRequest("POST", "/api/auth/wallet/link-verify", {
      walletAddress,
      challenge,
      signature: signResult.signature,
      publicKey: signResult.publicKey,
    });

    if (!verifyRes.ok) {
      const error = await verifyRes.text();
      console.error("[Wallet] Link verification failed:", error);
      throw new Error(error);
    }

    console.log("[Wallet] Wallet linked successfully!");
    return { success: true, walletAddress };
  } catch (error) {
    console.error("[Wallet] Link error:", error);
    throw error;
  }
}
