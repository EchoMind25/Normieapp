import { Nft, InsertNft, NftCollection, InsertNftCollection } from "@shared/schema";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_API_URL = `https://api.helius.xyz/v0`;

interface HeliusNft {
  id: string;
  content?: {
    json_uri?: string;
    metadata?: {
      name?: string;
      symbol?: string;
      description?: string;
      attributes?: Array<{ trait_type: string; value: string | number }>;
    };
    links?: {
      image?: string;
    };
  };
  creators?: Array<{
    address: string;
    share: number;
    verified: boolean;
  }>;
  royalty?: {
    royalty_model: string;
    percent: number;
    basis_points: number;
  };
  grouping?: Array<{
    group_key: string;
    group_value: string;
  }>;
  ownership?: {
    owner: string;
  };
  compression?: {
    compressed: boolean;
  };
}

interface HeliusAssetsByOwnerResponse {
  items: HeliusNft[];
  total: number;
  limit: number;
  page: number;
}

interface HeliusAssetResponse {
  id: string;
  content?: {
    json_uri?: string;
    metadata?: {
      name?: string;
      symbol?: string;
      description?: string;
      attributes?: Array<{ trait_type: string; value: string | number }>;
    };
    links?: {
      image?: string;
    };
  };
  creators?: Array<{
    address: string;
    share: number;
    verified: boolean;
  }>;
  royalty?: {
    percent: number;
  };
  grouping?: Array<{
    group_key: string;
    group_value: string;
  }>;
  ownership?: {
    owner: string;
  };
}

export async function fetchNFTsByOwner(ownerAddress: string): Promise<HeliusNft[]> {
  if (!HELIUS_API_KEY) {
    console.error("[Helius] Missing API key");
    return [];
  }

  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "get-nfts",
        method: "getAssetsByOwner",
        params: {
          ownerAddress,
          page: 1,
          limit: 1000,
          displayOptions: {
            showFungible: false,
            showNativeBalance: false,
          },
        },
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("[Helius] API error:", data.error);
      return [];
    }

    const assets = (data.result as HeliusAssetsByOwnerResponse)?.items || [];
    console.log(`[Helius] Found ${assets.length} NFTs for wallet ${ownerAddress.slice(0, 8)}...`);
    return assets;
  } catch (error) {
    console.error("[Helius] Error fetching NFTs:", error);
    return [];
  }
}

export async function fetchNFTMetadata(mintAddress: string): Promise<HeliusAssetResponse | null> {
  if (!HELIUS_API_KEY) {
    console.error("[Helius] Missing API key");
    return null;
  }

  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "get-asset",
        method: "getAsset",
        params: { id: mintAddress },
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("[Helius] API error:", data.error);
      return null;
    }

    return data.result as HeliusAssetResponse;
  } catch (error) {
    console.error("[Helius] Error fetching NFT metadata:", error);
    return null;
  }
}

export async function fetchNFTsByCollection(collectionAddress: string, page = 1, limit = 50): Promise<HeliusNft[]> {
  if (!HELIUS_API_KEY) {
    console.error("[Helius] Missing API key");
    return [];
  }

  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "get-collection-nfts",
        method: "getAssetsByGroup",
        params: {
          groupKey: "collection",
          groupValue: collectionAddress,
          page,
          limit,
          displayOptions: {
            showFungible: false,
          },
        },
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("[Helius] API error:", data.error);
      return [];
    }

    return (data.result as HeliusAssetsByOwnerResponse)?.items || [];
  } catch (error) {
    console.error("[Helius] Error fetching collection NFTs:", error);
    return [];
  }
}

export function heliusNftToInsertNft(asset: HeliusNft, collectionId?: string): InsertNft {
  const metadata = asset.content?.metadata;
  const primaryCreator = asset.creators?.find(c => c.verified) || asset.creators?.[0];
  
  return {
    mintAddress: asset.id,
    collectionId,
    ownerAddress: asset.ownership?.owner || null,
    creatorAddress: primaryCreator?.address || null,
    metadataUri: asset.content?.json_uri || null,
    name: metadata?.name || null,
    description: metadata?.description || null,
    imageUrl: asset.content?.links?.image || null,
    attributes: metadata?.attributes ? JSON.stringify(metadata.attributes) : null,
    royaltyPercentage: asset.royalty?.percent?.toString() || "5.0",
  };
}

export function parseNftAttributes(attributesJson: string | null): Array<{ trait_type: string; value: string | number }> {
  if (!attributesJson) return [];
  try {
    return JSON.parse(attributesJson);
  } catch {
    return [];
  }
}

export async function getCollectionFloorPrice(collectionSymbol: string): Promise<string | null> {
  try {
    const response = await fetch(`${HELIUS_API_URL}/token-metadata?api-key=${HELIUS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mintAccounts: [],
        includeOffChain: true,
        disableCache: false,
      }),
    });
    
    if (!response.ok) return null;
    return null;
  } catch {
    return null;
  }
}

export interface NftWithListing {
  nft: Nft;
  listing?: {
    id: string;
    priceSol: string;
    sellerId: string;
    sellerAddress: string;
    listedAt: Date | null;
  };
  collection?: NftCollection;
  isFavorited?: boolean;
}
