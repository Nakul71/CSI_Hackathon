import {
  Activity,
  Suggestion,
  KPIData,
  TimeSeriesPoint,
  UsageDistribution,
  Settings,
  SustainabilityBreakdown,
  CompressionIntensity,
  CompressionResult,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5001"
    : "https://carbon-oh-no.onrender.com");

// ── Generic fetch helper ─────────────────────────────

async function fetchJSON<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res.json();
}

// ── Dashboard ────────────────────────────────────────

interface DashboardResponse {
  kpi: KPIData;
  timeSeries: TimeSeriesPoint[];
  distribution: UsageDistribution[];
  recentActivities: Activity[];
}

export function fetchDashboard(userId?: string): Promise<DashboardResponse> {
  const qs = userId ? `?userId=${userId}` : "";
  return fetchJSON(`/api/dashboard${qs}`);
}

export function fetchKPI(userId?: string): Promise<KPIData> {
  const qs = userId ? `?userId=${userId}` : "";
  return fetchJSON(`/api/dashboard/kpi${qs}`);
}

// ── Activities ───────────────────────────────────────

interface ActivitiesResponse {
  data: Activity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function fetchActivities(params?: {
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  userId?: string;
}): Promise<ActivitiesResponse> {
  const query = new URLSearchParams();
  if (params?.type && params.type !== "all") query.set("type", params.type);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.userId) query.set("userId", params.userId);

  const qs = query.toString();
  return fetchJSON(`/api/activities${qs ? `?${qs}` : ""}`);
}

// ── Suggestions ──────────────────────────────────────

export function fetchSuggestions(userId?: string, impact?: string): Promise<Suggestion[]> {
  const query = new URLSearchParams();
  if (userId) query.set("userId", userId);
  if (impact && impact !== "all") query.set("impact", impact);
  
  const qs = query.toString();
  return fetchJSON(`/api/ai-suggestions${qs ? `?${qs}` : ""}`);
}

interface ApplySuggestionResponse {
  suggestion: Suggestion;
  updatedKPI: KPIData;
}

export function applySuggestionAPI(id: string, userId?: string): Promise<ApplySuggestionResponse> {
  return fetchJSON(`/api/suggestions/${id}/apply`, { 
    method: "PATCH",
    body: JSON.stringify({ userId })
  });
}

// ── Score ────────────────────────────────────────────

interface ScoreResponse {
  score: number;
  breakdown: SustainabilityBreakdown;
}

export function fetchScore(userId?: string): Promise<ScoreResponse> {
  const qs = userId ? `?userId=${userId}` : "";
  return fetchJSON(`/api/score${qs}`);
}

// ── Settings ─────────────────────────────────────────

export function fetchSettings(userId?: string): Promise<Settings> {
  const qs = userId ? `?userId=${userId}` : "";
  return fetchJSON(`/api/settings${qs}`);
}

export function updateSettingsAPI(
  partial: Partial<Settings>,
  userId?: string
): Promise<Settings> {
  return fetchJSON("/api/settings", {
    method: "PATCH",
    body: JSON.stringify({ ...partial, userId }),
  });
}

// ── Calculate ────────────────────────────────────────

interface CalculateResponse {
  type: string;
  size: string;
  parsed: { value: number; unit: string };
  costINR: number;
  carbonKg: number;
}

export function calculateImpact(
  type: string,
  size: string
): Promise<CalculateResponse> {
  return fetchJSON("/api/calculate", {
    method: "POST",
    body: JSON.stringify({ type, size }),
  });
}

// ── Prompt Optimization ──────────────────────────────

export function shortenPromptAPI(
  prompt: string,
  intensity: CompressionIntensity = "balanced",
  userId?: string,
  logActivity: boolean = true
): Promise<CompressionResult> {
  return fetchJSON("/api/prompt/shorten", {
    method: "POST",
    body: JSON.stringify({ prompt, intensity, userId, logActivity }),
  });
}

export function analyzePromptAPI(prompt: string): Promise<{
  promptLength: number;
  estimatedTokens: number;
  estimatedCostINR: number;
  estimatedCarbonKg: number;
  needsOptimization: boolean;
}> {
  return fetchJSON("/api/prompt/analyze", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

