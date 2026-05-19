import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
const sessionTokenStorageKey = "glam_session_token";

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export function readStoredSessionToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(sessionTokenStorageKey);
}

export function storeSessionToken(token?: string | null) {
  if (typeof window === "undefined") return;

  if (token) {
    window.localStorage.setItem(sessionTokenStorageKey, token);
    return;
  }

  window.localStorage.removeItem(sessionTokenStorageKey);
}

export function clearStoredSessionToken() {
  storeSessionToken(null);
}

export function authHeaders(): HeadersInit {
  const token = readStoredSessionToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function configureApiBaseUrl() {
  setBaseUrl(apiBaseUrl || null);
  setAuthTokenGetter(() => readStoredSessionToken());
}
