import { setBaseUrl } from "@workspace/api-client-react";

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export function configureApiBaseUrl() {
  setBaseUrl(apiBaseUrl || null);
}
