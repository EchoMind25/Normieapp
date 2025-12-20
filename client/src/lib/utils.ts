import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize avatar/image URLs to handle legacy /api/storage/public paths
 * Converts them to the correct /objects/... format used by object storage routes
 * 
 * Handles formats like:
 * - /api/storage/public//objects/uploads/uuid -> /objects/uploads/uuid
 * - /api/storage/public/objects/uploads/uuid -> /objects/uploads/uuid
 * - /objects/uploads/uuid -> /objects/uploads/uuid (already correct)
 * - https://... -> https://... (external URLs unchanged)
 */
export function normalizeStorageUrl(url: string | null | undefined): string {
  if (!url) return "";
  
  // Skip external URLs
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  
  let normalized = url;
  
  // Remove legacy /api/storage/public prefix if present
  if (normalized.startsWith("/api/storage/public/")) {
    normalized = normalized.slice("/api/storage/public".length);
  }
  
  // Collapse multiple consecutive slashes into single slashes, preserving leading slash
  // Split on slashes, filter empty segments, rejoin with single slashes
  const segments = normalized.split("/").filter(segment => segment.length > 0);
  normalized = "/" + segments.join("/");
  
  // If it now starts with /objects/, it's correct
  if (normalized.startsWith("/objects/")) {
    return normalized;
  }
  
  // If it starts with /uploads/, add /objects prefix
  if (normalized.startsWith("/uploads/")) {
    return `/objects${normalized}`;
  }
  
  // Return normalized path for relative paths, or original for unrecognized formats
  return normalized.startsWith("/") ? normalized : url;
}
