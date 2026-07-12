import crypto from "node:crypto";

// Secret used to hash OTP codes at rest. Reuses the session secret when configured;
// falls back to a fixed dev value when running locally without auth. The plaintext
// code is never persisted — only the HMAC of `${requestId}:${code}`.
function otpSecret() {
  return process.env.GLAM_SESSION_SECRET ?? process.env.GLAM_ADMIN_PASSWORD ?? "glam-dev-otp-secret";
}

/** Whether the server is running in a production-like mode (auth enabled). */
export function isProdLike() {
  return Boolean(process.env.GLAM_ADMIN_PASSWORD);
}

/** Generates a 6-digit numeric verification code. */
export function generateOtp(): string {
  // 0 – 999999, zero-padded. Uniform across the range via rejection-free modulo on a
  // large random integer (bias is negligible for a 6-digit code).
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

/** HMAC-SHA256 of the code bound to a specific request id, hex-encoded. */
export function hashOtp(requestId: number, code: string): string {
  return crypto.createHmac("sha256", otpSecret()).update(`${requestId}:${code}`).digest("hex");
}

/** Constant-time comparison of a submitted code against a stored hash. */
export function verifyOtp(requestId: number, code: string, storedHash: string): boolean {
  const candidate = hashOtp(requestId, code);
  if (candidate.length !== storedHash.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(storedHash));
  } catch {
    return false;
  }
}
