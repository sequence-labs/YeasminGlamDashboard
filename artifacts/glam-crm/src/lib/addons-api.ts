import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl, authHeaders } from "./api-base";

// ---- Types (mirror the hand-wired API in artifacts/api-server/src/routes/addons.ts
// and public-addons.ts; these endpoints are intentionally not part of the OpenAPI codegen) ----

export type AddonStatus = "pending" | "approved" | "declined" | "expired" | "cancelled";
export type AddonSource = "on_day" | "pre_event";

export type AddonRequestItem = {
  id: number;
  serviceItemId: number | null;
  name: string;
  description: string | null;
  unitLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  sortOrder: number;
};

export type AddonRequest = {
  id: number;
  token: string;
  bookingId: number;
  status: AddonStatus;
  source: AddonSource;
  artistNote: string | null;
  clientNameSnapshot: string;
  clientEmailSnapshot: string | null;
  docusignEnvelopeIdSnapshot: string | null;
  total: number;
  approvalUrl: string;
  createdAt: string;
  decidedAt: string | null;
  expiresAt: string | null;
  items: AddonRequestItem[];
};

export type AddonRequestsResponse = {
  bookingId: number;
  docusignEnvelopeId: string | null;
  approvedAddonsTotal: number;
  shareToken: string | null;
  requests: AddonRequest[];
};

export type PublicAddonView = {
  status: AddonStatus;
  source: AddonSource;
  artistNote: string | null;
  clientName: string;
  total: number;
  items: AddonRequestItem[];
  bookingHeadline: string;
  destinationMasked: string | null;
  hasContact: boolean;
  decidedAt: string | null;
  artistName: string;
  businessName: string;
};

export type SendCodeResponse = { sent: boolean; destinationMasked: string; devCode?: string };

export type AddonMenuService = {
  id: number;
  name: string;
  description: string | null;
  kind: "service" | "fee";
  unitLabel: string;
  defaultUnitPrice: number;
};

export type AddonMenu = {
  bookingHeadline: string;
  clientName: string;
  artistName: string;
  businessName: string;
  approvedAddonsTotal: number;
  services: AddonMenuService[];
};

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.error === "string") return data.error;
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`;
}

// Endpoints live under the same `/api` prefix as the generated client (proxied to the API
// server in dev; prefixed onto the deployed origin via apiBaseUrl in prod).
function endpoint(path: string) {
  return apiUrl(`/api${path}`);
}

async function getJson<T>(path: string, withAuth: boolean): Promise<T> {
  const res = await fetch(endpoint(path), {
    headers: { ...(withAuth ? authHeaders() : {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as T;
}

async function sendJson<T>(path: string, method: string, body: unknown, withAuth: boolean): Promise<T> {
  const res = await fetch(endpoint(path), {
    method,
    headers: { "content-type": "application/json", ...(withAuth ? authHeaders() : {}) },
    credentials: "include",
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as T;
}

// ---- Admin (authenticated) ----

export function addonRequestsQueryKey(bookingId: number) {
  return ["addon-requests", bookingId] as const;
}

export function useAddonRequests(bookingId: number) {
  return useQuery({
    queryKey: addonRequestsQueryKey(bookingId),
    queryFn: () => getJson<AddonRequestsResponse>(`/bookings/${bookingId}/addon-requests`, true),
    enabled: Number.isFinite(bookingId) && bookingId > 0,
  });
}

export function useCreateAddonRequest(bookingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { items: { serviceItemId: number; quantity: number }[]; note?: string; source?: AddonSource }) =>
      sendJson<AddonRequest>(`/bookings/${bookingId}/addon-requests`, "POST", input, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: addonRequestsQueryKey(bookingId) }),
  });
}

export function useCancelAddonRequest(bookingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => sendJson<AddonRequest>(`/addon-requests/${requestId}/cancel`, "POST", {}, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: addonRequestsQueryKey(bookingId) }),
  });
}

export function useSetDocusignEnvelope(bookingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (envelopeId: string | null) =>
      sendJson<{ bookingId: number; docusignEnvelopeId: string | null }>(
        `/bookings/${bookingId}/docusign-envelope`,
        "PUT",
        { envelopeId },
        true,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: addonRequestsQueryKey(bookingId) }),
  });
}

// ---- Public (no auth) ----

export function publicAddonQueryKey(token: string) {
  return ["public-addon", token] as const;
}

export function usePublicAddon(token: string) {
  return useQuery({
    queryKey: publicAddonQueryKey(token),
    queryFn: () => getJson<PublicAddonView>(`/public/addon/${token}`, false),
    enabled: !!token,
  });
}

export function useSendAddonCode(token: string) {
  return useMutation({
    mutationFn: () => sendJson<SendCodeResponse>(`/public/addon/${token}/send-code`, "POST", {}, false),
  });
}

export function useDecideAddon(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { decision: "approve" | "decline"; code: string }) =>
      sendJson<PublicAddonView>(`/public/addon/${token}/${input.decision}`, "POST", { code: input.code }, false),
    onSuccess: () => qc.invalidateQueries({ queryKey: publicAddonQueryKey(token) }),
  });
}

export function publicAddonMenuQueryKey(shareToken: string) {
  return ["public-addon-menu", shareToken] as const;
}

export function usePublicAddonMenu(shareToken: string) {
  return useQuery({
    queryKey: publicAddonMenuQueryKey(shareToken),
    queryFn: () => getJson<AddonMenu>(`/public/addon-menu/${shareToken}`, false),
    enabled: !!shareToken,
  });
}

export function useRequestFromMenu(shareToken: string) {
  return useMutation({
    mutationFn: (input: { items: { serviceItemId: number; quantity: number }[]; note?: string }) =>
      sendJson<{ token: string; approvalUrl: string }>(`/public/addon-menu/${shareToken}/request`, "POST", input, false),
  });
}
