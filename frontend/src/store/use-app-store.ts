import { create } from "zustand";
import {
  Activity,
  Suggestion,
  Settings,
  KPIData,
  SustainabilityBreakdown,
  TimeSeriesPoint,
  UsageDistribution,
  ActivityType,
} from "@/lib/types";
import {
  fetchDashboard,
  fetchActivities,
  fetchSuggestions,
  fetchScore,
  fetchSettings,
  applySuggestionAPI,
  updateSettingsAPI,
} from "@/lib/api";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface AppState {
  // User Identity
  userId: string | null;
  setUserId: (id: string | null) => void;

  // Loading
  loading: boolean;
  error: string | null;

  // KPI
  kpi: KPIData;
  setKPI: (kpi: KPIData) => void;

  // Activities
  activities: Activity[];
  activityHistory: Activity[];
  addActivity: (activity: Activity) => void;

  // Suggestions
  suggestions: Suggestion[];
  applySuggestion: (id: string) => Promise<void>;

  // Charts
  timeSeries: TimeSeriesPoint[];
  distribution: UsageDistribution[];

  // Sustainability
  sustainabilityScore: number;
  breakdown: SustainabilityBreakdown;

  // Settings
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;

  // Filters
  activityTypeFilter: ActivityType | "all";
  setActivityTypeFilter: (filter: ActivityType | "all") => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;

  // Real-time state
  isLiveTracking: boolean;
  toggleLiveTracking: () => void;

  // Data fetching
  fetchDashboardData: () => Promise<void>;
  fetchActivityHistory: () => Promise<void>;
  fetchSuggestionsData: () => Promise<void>;
  fetchScoreData: () => Promise<void>;
  fetchSettingsData: () => Promise<void>;
}

const defaultKPI: KPIData = {
  totalCostSaved: 0,
  totalCO2Saved: 0,
  emailsOptimized: 0,
  aiUsageReduced: 0,
  searchesOptimized: 0,
};

// Helper to get or create a unique userId per browser session
const getOrCreateUserId = (): string | null => {
  if (typeof window === "undefined") return null;

  // Priority 1: URL param (from Chrome extension popup link)
  const params = new URLSearchParams(window.location.search);
  const urlUserId = params.get("user") || params.get("userId");
  if (urlUserId) {
    // Save the extension's userId so it persists for this browser too
    localStorage.setItem("carbon_user_id", urlUserId);
    return urlUserId;
  }

  // Priority 2: Previously saved userId in this browser
  const savedId = localStorage.getItem("carbon_user_id");
  if (savedId) return savedId;

  // Priority 3: Generate a new unique userId for this browser
  const newId = "user-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  localStorage.setItem("carbon_user_id", newId);
  return newId;
};

export const useAppStore = create<AppState>((set, get) => ({
  // User Identity
  userId: getOrCreateUserId(),
  setUserId: (userId) => set({ userId }),

  // Loading
  loading: false,
  error: null,

  // KPI
  kpi: defaultKPI,
  setKPI: (kpi) => set({ kpi }),

  // Activities
  activities: [],
  activityHistory: [],
  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities].slice(0, 20),
      activityHistory: [activity, ...state.activityHistory],
    })),

  // Suggestions
  suggestions: [],
  applySuggestion: async (id) => {
    const { userId } = get();
    try {
      const { suggestion, updatedKPI } = await applySuggestionAPI(id, userId || undefined);
      set((state) => ({
        suggestions: state.suggestions.map((s) =>
          s.id === id ? suggestion : s
        ),
        kpi: updatedKPI,
      }));
    } catch {
      // Optimistic fallback: update locally if backend fails
      set((state) => ({
        suggestions: state.suggestions.map((s) =>
          s.id === id ? { ...s, applied: true } : s
        ),
        kpi: {
          ...state.kpi,
          totalCostSaved:
            state.kpi.totalCostSaved +
            (state.suggestions.find((s) => s.id === id)?.savingsINR ?? 0),
          totalCO2Saved:
            state.kpi.totalCO2Saved +
            (state.suggestions.find((s) => s.id === id)?.savingsCO2 ?? 0),
        },
      }));
    }
  },

  // Charts
  timeSeries: [],
  distribution: [],

  // Sustainability
  sustainabilityScore: 0,
  breakdown: { email: 0, ai: 0, storage: 0, search: 0 },

  // Settings
  settings: {
    privacyMode: false,
    notifications: true,
    gmailConnected: false,
    aiToolsConnected: false,
  },
  updateSettings: async (partial) => {
    const { userId } = get();
    // Optimistic update
    set((state) => ({
      settings: { ...state.settings, ...partial },
    }));
    try {
      const updated = await updateSettingsAPI(partial, userId || undefined);
      set({ settings: updated });
    } catch {
      // Revert on failure would go here; for now keep optimistic
    }
  },

  // Filters
  activityTypeFilter: "all",
  setActivityTypeFilter: (filter) => set({ activityTypeFilter: filter }),
  dateRange: { from: undefined, to: undefined },
  setDateRange: (range) => set({ dateRange: range }),

  // Real-time
  isLiveTracking: true,
  toggleLiveTracking: () =>
    set((state) => ({ isLiveTracking: !state.isLiveTracking })),

  // ── Data Fetching ────────────────────────────────

  fetchDashboardData: async () => {
    const { userId } = get();
    set({ loading: true, error: null });
    try {
      const data = await fetchDashboard(userId || undefined);
      const parsedActivities = data.recentActivities.map((a) => ({
        ...a,
        timestamp: new Date(a.timestamp),
      }));
      set({
        kpi: data.kpi,
        timeSeries: data.timeSeries,
        distribution: data.distribution,
        activities: parsedActivities,
        loading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchActivityHistory: async () => {
    const { activityTypeFilter, dateRange, userId } = get();
    set({ loading: true, error: null });
    try {
      const data = await fetchActivities({
        type: activityTypeFilter,
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString(),
        limit: 100,
        userId: userId || undefined,
      });
      // Parse timestamp strings into Date objects for frontend
      const parsed = data.data.map((a) => ({
        ...a,
        timestamp: new Date(a.timestamp),
      }));
      set({ activityHistory: parsed, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchSuggestionsData: async () => {
    const { userId } = get();
    set({ loading: true, error: null });
    try {
      const data = await fetchSuggestions(userId || undefined);
      set({ suggestions: data, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchScoreData: async () => {
    const { userId } = get();
    set({ loading: true, error: null });
    try {
      const data = await fetchScore(userId || undefined);
      set({
        sustainabilityScore: data.score,
        breakdown: data.breakdown,
        loading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchSettingsData: async () => {
    const { userId } = get();
    try {
      const data = await fetchSettings(userId || undefined);
      set({ settings: data });
    } catch {
      // Use defaults on failure
    }
  },
}));
