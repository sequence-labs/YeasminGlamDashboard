import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl, authHeaders } from "./api-base";

// Hand-wired (not OpenAPI codegen) admin-only endpoints for booking-level Upgrade Menu
// customization — see artifacts/api-server/src/routes/booking-upgrade-menu.ts.

export type UpgradeMenuResolvedItem = {
  serviceItemId: number;
  kind: "service" | "fee";
  name: string;
  description: string | null;
  unitPrice: number;
  unitLabel: string;
  included: boolean;
  followGlobal: boolean;
  hasOverride: boolean;
  globalActive: boolean;
  globalShowOnUpgradeMenu: boolean;
  sortOrder: number;
};

export type UpgradeMenuSnapshot = { id: number; label: string | null; createdAt: string };

export type UpgradeMenuConfig = {
  bookingId: number;
  items: UpgradeMenuResolvedItem[];
  snapshots: UpgradeMenuSnapshot[];
};

function endpoint(path: string) {
  return apiUrl(`/api${path}`);
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.error === "string") return data.error;
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(endpoint(path), { headers: authHeaders(), credentials: "include" });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as T;
}

async function sendJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(endpoint(path), {
    method,
    headers: { "content-type": "application/json", ...authHeaders() },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function upgradeMenuConfigQueryKey(bookingId: number) {
  return ["upgrade-menu-config", bookingId] as const;
}

export function useUpgradeMenuConfig(bookingId: number) {
  return useQuery({
    queryKey: upgradeMenuConfigQueryKey(bookingId),
    queryFn: () => getJson<UpgradeMenuConfig>(`/bookings/${bookingId}/upgrade-menu-config`),
    enabled: Number.isFinite(bookingId) && bookingId > 0,
  });
}

export type SetItemOverrideInput = {
  included: boolean;
  followGlobal: boolean;
  name?: string;
  description?: string | null;
  unitPrice?: number;
  unitLabel?: string;
};

export function useSetUpgradeMenuItem(bookingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceItemId, ...input }: SetItemOverrideInput & { serviceItemId: number }) =>
      sendJson<{ items: UpgradeMenuResolvedItem[] }>(`/bookings/${bookingId}/upgrade-menu-config/${serviceItemId}`, "PUT", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: upgradeMenuConfigQueryKey(bookingId) }),
  });
}

export function useResetUpgradeMenuItem(bookingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serviceItemId: number) =>
      sendJson<{ items: UpgradeMenuResolvedItem[] }>(`/bookings/${bookingId}/upgrade-menu-config/${serviceItemId}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: upgradeMenuConfigQueryKey(bookingId) }),
  });
}

export function useSaveUpgradeMenuSnapshot(bookingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label?: string) => sendJson<UpgradeMenuSnapshot>(`/bookings/${bookingId}/upgrade-menu-snapshots`, "POST", { label }),
    onSuccess: () => qc.invalidateQueries({ queryKey: upgradeMenuConfigQueryKey(bookingId) }),
  });
}

export function useDeleteUpgradeMenuSnapshot(bookingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (snapshotId: number) => sendJson<void>(`/bookings/${bookingId}/upgrade-menu-snapshots/${snapshotId}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: upgradeMenuConfigQueryKey(bookingId) }),
  });
}

export function useRestoreUpgradeMenuSnapshot(bookingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (snapshotId: number) =>
      sendJson<{ items: UpgradeMenuResolvedItem[] }>(`/bookings/${bookingId}/upgrade-menu-snapshots/${snapshotId}/restore`, "POST"),
    onSuccess: () => qc.invalidateQueries({ queryKey: upgradeMenuConfigQueryKey(bookingId) }),
  });
}
