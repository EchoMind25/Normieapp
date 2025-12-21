import crypto from "crypto";
import type { Response, Request } from "express";

export function generateETag(data: unknown, excludeFields?: string[]): string {
  let content: string;
  
  if (typeof data === "string") {
    content = data;
  } else if (excludeFields && excludeFields.length > 0 && typeof data === "object" && data !== null) {
    const filtered = { ...data as Record<string, unknown> };
    for (const field of excludeFields) {
      delete filtered[field];
    }
    content = JSON.stringify(filtered);
  } else {
    content = JSON.stringify(data);
  }
  
  const hash = crypto.createHash("md5").update(content).digest("hex").slice(0, 16);
  return `"${hash}"`;
}

export function handleConditionalGet(
  req: Request,
  res: Response,
  data: unknown,
  cacheMaxAge: number = 10,
  excludeFields?: string[]
): boolean {
  const etag = generateETag(data, excludeFields);
  const clientETag = req.headers["if-none-match"];
  
  res.set("ETag", etag);
  res.set("Cache-Control", `public, max-age=${cacheMaxAge}`);
  
  if (clientETag && clientETag === etag) {
    res.status(304).end();
    return true;
  }
  
  return false;
}
