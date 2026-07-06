import { getSupabaseBrowser } from "./supabase-browser";
import * as mock from "./mock";

export const USE_MOCK = false;

// ── Response types (contract shapes, all camelCase) ──────────────────────────

export interface MeResponse {
  userId: string;
  plan: "free" | "larper" | "pro";
  credits: number;
  rerollsRemaining: number;
  unlimited: boolean;
}

export interface UploadResponse {
  uploadId: string;
  expiresInSeconds: number;
}

export interface Style {
  id: string;
  name: string;
  description: string;
  previewEmoji: string;
}

export interface StylesResponse {
  styles: Style[];
}

export interface CreateGenerationParams {
  platform: "instagram" | "tiktok";
  format: "slideshow" | "video";
  withFace: boolean;
  selfieUploadId: string | null;
  count: number;
  styleId: string | null;
}

export interface CreateGenerationResponse {
  jobId: string;
  status: "processing";
  estimatedSeconds: number;
  creditsCharged: number;
}

export interface Asset {
  id: string;
  type: "image" | "video";
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  sceneTag: string;
  rerollable: boolean;
}

export interface Caption {
  id: string;
  text: string;
  tone: string;
}

export interface Sound {
  id: string;
  title: string;
  meta: string;
  platform: string;
  openUrl: string;
}

export interface JobPollingResponse {
  jobId: string;
  status: "processing" | "complete" | "failed";
  progress?: number;
  platform?: string;
  format?: string;
  assets?: Asset[];
  captions?: Caption[];
  sounds?: Sound[];
  error?: string;
  retryable?: boolean;
}

export interface HistoryJob {
  jobId: string;
  status: "processing" | "complete" | "failed";
  platform: "instagram" | "tiktok";
  format: "slideshow" | "video";
  count: number;
  withFace: boolean;
  createdAt: string;
  thumbUrl: string | null;
}

export interface HistoryResponse {
  jobs: HistoryJob[];
  hasMore: boolean;
}

export interface RerollResponse {
  assetId: string;
  status: "processing";
  creditsCharged: number;
  rerollsRemaining: number;
}

export interface CheckoutResponse {
  checkoutUrl: string;
}

export interface PortalResponse {
  portalUrl: string;
}

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const {
    data: { session },
  } = await getSupabaseBrowser().auth.getSession();
  return session?.access_token ?? null;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, ...rest } = options;
  const token = await getToken();

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(rest.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`/api${path}`, {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "unknown" }));
    throw new ApiError(
      body.error ?? "unknown",
      body.message ?? body.error ?? "Request failed",
      res.status,
    );
  }

  return res.json();
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getMe(): Promise<MeResponse> {
  if (USE_MOCK) return mock.mockMe;
  return apiFetch<MeResponse>("/me");
}

// Public endpoint — no auth needed, safe to call before login.
export async function getStyles(): Promise<StylesResponse> {
  return apiFetch<StylesResponse>("/styles");
}

export async function uploadSelfie(file: File): Promise<UploadResponse> {
  if (USE_MOCK) return mock.mockUpload;
  const form = new FormData();
  form.append("file", file);
  return apiFetch<UploadResponse>("/uploads", { method: "POST", body: form });
}

export async function createGeneration(
  params: CreateGenerationParams,
): Promise<CreateGenerationResponse> {
  if (USE_MOCK) return mock.mockJobCreated;
  return apiFetch<CreateGenerationResponse>("/generations", {
    method: "POST",
    json: params,
  });
}

export async function pollGeneration(
  jobId: string,
): Promise<JobPollingResponse> {
  if (USE_MOCK) return mock.mockJobComplete;
  return apiFetch<JobPollingResponse>(`/generations/${jobId}`);
}

export async function listGenerations(
  limit = 20,
  offset = 0,
): Promise<HistoryResponse> {
  return apiFetch<HistoryResponse>(`/generations?limit=${limit}&offset=${offset}`);
}

export async function deleteGeneration(jobId: string): Promise<{ deleted: true }> {
  return apiFetch<{ deleted: true }>(`/generations/${jobId}`, { method: "DELETE" });
}

export async function rerollAsset(
  jobId: string,
  assetId: string,
): Promise<RerollResponse> {
  if (USE_MOCK) return mock.mockReroll;
  return apiFetch<RerollResponse>(
    `/generations/${jobId}/assets/${assetId}/reroll`,
    { method: "POST" },
  );
}

export async function createCheckout(
  plan: "larper" | "pro",
): Promise<CheckoutResponse> {
  if (USE_MOCK) return mock.mockCheckout;
  return apiFetch<CheckoutResponse>("/billing/checkout", {
    method: "POST",
    json: { plan },
  });
}

export async function createBillingPortalSession(): Promise<PortalResponse> {
  return apiFetch<PortalResponse>("/billing/portal", { method: "POST" });
}
