import crypto from "node:crypto";

export function generateToken(byteLength = 24): string {
  return crypto.randomBytes(byteLength).toString("base64url");
}
