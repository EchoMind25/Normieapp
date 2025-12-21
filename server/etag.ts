import crypto from "crypto";
import type { Response, Request } from "express";

export function generateETag(data: unknown): string {
  const content = typeof data === "string" ? data : JSON.stringify(data);
  const hash = crypto.createHash("md5").update(content).digest("hex").slice(0, 16);
  return `"${hash}"`;
}

export function handleConditionalGet(
  req: Request,
  res: Response,
  data: unknown,
  cacheMaxAge: number = 10
): boolean {
  const etag = generateETag(data);
  const clientETag = req.headers["if-none-match"];
  
  res.set("ETag", etag);
  res.set("Cache-Control", `public, max-age=${cacheMaxAge}`);
  
  if (clientETag && clientETag === etag) {
    res.status(304).end();
    return true;
  }
  
  return false;
}
