import { PublicKey } from "@solana/web3.js";
import { apiRequest } from "./queryClient";
import { isNative, isIOS, isAndroid } from "./native-utils";

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

// Mobile wallet app detection and deep linking
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function getMobileWalletDeepLink(provider: WalletProvider, action: 'connect' | 'browse' = 'browse'): string {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const encodedUrl = encodeURIComponent(currentUrl);
  
  if (provider === 'phantom') {
    // Phantom universal link for browsing dApp in wallet browser
    return `https://phantom.app/ul/v1/browse/${encodedUrl}`;
  } else {
    // Solflare deep link for browsing dApp in wallet browser
    return `solflare://v1/browse/${currentUrl}`;
  }
}

export function getWalletAppStoreLink(provider: WalletProvider): { ios: string; android: string; universal: string } {
  if (provider === 'phantom') {
    return {
      ios: 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977',
      android: 'https://play.google.com/store/apps/details?id=app.phantom',
      universal: 'https://phantom.app/download',
    };
  } else {
    return {
      ios: 'https://apps.apple.com/app/solflare-solana-wallet/id1580902717',
      android: 'https://play.google.com/store/apps/details?id=com.solflare.mobile',
      universal: 'https://solflare.com/download',
    };
  }
}

export function openInWalletBrowser(provider: WalletProvider): void {
  const deepLink = getMobileWalletDeepLink(provider, 'browse');
  
  if (isNative) {
    // On native Capacitor app, use the Browser plugin
    import('@capacitor/browser').then(({ Browser }) => {
      Browser.open({ url: deepLink, windowName: '_system' });
    }).catch(() => {
      window.open(deepLink, '_system');
    });
  } else {
    // On mobile web, redirect to deep link
    window.location.href = deepLink;
  }
}

export function getWalletDownloadLink(provider: WalletProvider): string {
  const links = getWalletAppStoreLink(provider);
  
  if (isIOS) return links.ios;
  if (isAndroid) return links.android;
  
  // Check user agent for mobile web
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('iphone') || ua.includes('ipad')) return links.ios;
    if (ua.includes('android')) return links.android;
  }
  
  return links.universal;
}

export function hasWalletInstalled(provider: WalletProvider): boolean {
  if (provider === 'phantom') {
    return !!window.solana?.isPhantom;
  } else if (provider === 'solflare') {
    return !!window.solflare?.isSolflare;
  }
  return false;
}

// Browser-native base64 encoding for Uint8Array (replaces Node.js Buffer)
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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

export interface WalletConnectionResult {
  address: string | null;
  needsWalletApp: boolean;
  downloadUrl?: string;
  deepLinkUrl?: string;
}

export async function connectWallet(provider: WalletProvider): Promise<string | null> {
  const wallet = getWallet(provider);
  
  // If wallet extension/app is available, use it directly
  if (wallet) {
    try {
      const response = await wallet.connect();
      return response.publicKey.toBase58();
    } catch (error) {
      return null;
    }
  }
  
  // For mobile devices without wallet detected, provide options
  if (isMobileDevice() || isNative) {
    // Return null but don't open anything - let the UI handle the options
    return null;
  }
  
  // Desktop without extension - open download page
  window.open(
    provider === "phantom" 
      ? "https://phantom.app/" 
      : "https://solflare.com/",
    "_blank"
  );
  return null;
}

export async function connectWalletWithMobileSupport(provider: WalletProvider): Promise<WalletConnectionResult> {
  const wallet = getWallet(provider);
  
  // If wallet extension/app is available, use it directly
  if (wallet) {
    try {
      const response = await wallet.connect();
      return {
        address: response.publicKey.toBase58(),
        needsWalletApp: false,
      };
    } catch (error) {
      return { address: null, needsWalletApp: false };
    }
  }
  
  // Wallet not detected - provide appropriate links
  const isMobile = isMobileDevice() || isNative;
  
  return {
    address: null,
    needsWalletApp: true,
    downloadUrl: getWalletDownloadLink(provider),
    deepLinkUrl: isMobile ? getMobileWalletDeepLink(provider, 'browse') : undefined,
  };
}

export async function disconnectWallet(provider: WalletProvider): Promise<void> {
  const wallet = getWallet(provider);
  if (wallet) {
    try {
      await wallet.disconnect();
    } catch (error) {
      // Disconnect error handled silently
    }
  }
}

export async function signMessage(
  provider: WalletProvider,
  message: string
): Promise<{ signature: string; publicKey: string } | null> {
  const wallet = getWallet(provider);
  if (!wallet || !wallet.publicKey) {
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
      signature: uint8ArrayToBase64(signature),
      publicKey: uint8ArrayToBase64(wallet.publicKey.toBytes()),
    };
  } catch (error: any) {
    return null;
  }
}

export async function authenticateWithWallet(
  provider: WalletProvider
): Promise<{ user: any; token: string } | null> {
  try {
    const walletAddress = await connectWallet(provider);
    if (!walletAddress) {
      return null;
    }

    const challengeRes = await apiRequest("POST", "/api/auth/wallet/challenge", {
      walletAddress,
    });
    if (!challengeRes.ok) {
      return null;
    }
    const { challenge } = await challengeRes.json();

    const signResult = await signMessage(provider, challenge);
    if (!signResult) {
      return null;
    }

    const verifyRes = await apiRequest("POST", "/api/auth/wallet/verify", {
      walletAddress,
      challenge,
      signature: signResult.signature,
      publicKey: signResult.publicKey,
    });

    if (!verifyRes.ok) {
      const error = await verifyRes.text();
      throw new Error(`Verification failed: ${error}`);
    }

    return verifyRes.json();
  } catch (error) {
    return null;
  }
}

export async function linkWalletToAccount(
  provider: WalletProvider
): Promise<{ success: boolean; walletAddress: string } | null> {
  try {
    const walletAddress = await connectWallet(provider);
    if (!walletAddress) {
      return null;
    }

    const challengeRes = await apiRequest("POST", "/api/auth/wallet/link-challenge", {
      walletAddress,
    });
    if (!challengeRes.ok) {
      const error = await challengeRes.text();
      throw new Error(error);
    }
    const { challenge } = await challengeRes.json();

    const signResult = await signMessage(provider, challenge);
    if (!signResult) {
      return null;
    }

    const verifyRes = await apiRequest("POST", "/api/auth/wallet/link-verify", {
      walletAddress,
      challenge,
      signature: signResult.signature,
      publicKey: signResult.publicKey,
    });

    if (!verifyRes.ok) {
      const error = await verifyRes.text();
      throw new Error(error);
    }

    return { success: true, walletAddress };
  } catch (error) {
    throw error;
  }
}
