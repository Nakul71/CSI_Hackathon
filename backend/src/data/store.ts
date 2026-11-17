import { generateId } from "../utils/helpers";
import {
  Activity,
  Suggestion,
  TimeSeriesPoint,
  UsageDistribution,
  KPIData,
  SustainabilityBreakdown,
  Settings,
} from "../types";

/**
 * Multi-user in-memory data store. 
 * Groups all activity data by userId.
 */

export interface UserStore {
  kpi: KPIData;
  activities: Activity[];
  timeSeries: TimeSeriesPoint[];
  distribution: UsageDistribution[];
  suggestions: Suggestion[];
  sustainabilityScore: number;
  breakdown: SustainabilityBreakdown;
  settings: Settings;
}

const userStores: Record<string, UserStore> = {};

const createInitialStore = (): UserStore => ({
  kpi: {
    totalCostSaved: 0,
    totalCO2Saved: 0,
    emailsOptimized: 0,
    aiUsageReduced: 0,
    searchesOptimized: 0,
  },
  activities: [],
  timeSeries: [
    { date: "Mon", cost: 0, carbon: 0 },
    { date: "Tue", cost: 0, carbon: 0 },
    { date: "Wed", cost: 0, carbon: 0 },
    { date: "Thu", cost: 0, carbon: 0 },
    { date: "Fri", cost: 0, carbon: 0 },
    { date: "Sat", cost: 0, carbon: 0 },
    { date: "Sun", cost: 0, carbon: 0 },
  ],
  distribution: [
    { name: "Email", value: 0, color: "#3b82f6" },
    { name: "AI Usage", value: 0, color: "#8b5cf6" },
    { name: "Storage", value: 0, color: "#10b981" },
    { name: "Search", value: 0, color: "#f59e0b" },
  ],
  suggestions: [
    {
      id: generateId(),
      title: "Clean Up Large Email Attachments",
      description: "Search for emails larger than 10MB in Gmail and delete those you no longer need.",
      savingsINR: 15.50,
      savingsCO2: 0.25,
      impact: "high",
      category: "email",
      applied: false,
    },
    {
      id: generateId(),
      title: "Limit AI Image Generation & Compress Prompts",
      description: "Compress conversational prompts and remove redundant context before querying LLMs.",
      savingsINR: 8.20,
      savingsCO2: 0.12,
      impact: "medium",
      category: "ai",
      applied: false,
    },
    {
      id: generateId(),
      title: "Consolidate Cloud Storage",
      description: "Remove duplicate files and old backups from your cloud drive to reduce server energy.",
      savingsINR: 12.00,
      savingsCO2: 0.18,
      impact: "medium",
      category: "storage",
      applied: false,
    },
  ],
  sustainabilityScore: 100,
  breakdown: {
    email: 90,
    ai: 88,
    storage: 92,
    search: 95,
  },
  settings: {
    privacyMode: false,
    notifications: true,
    gmailConnected: false,
    aiToolsConnected: false,
  },
});

/**
 * Recomputes distribution, timeSeries, breakdown, and sustainabilityScore based on live activities.
 */
export function recalculateUserMetrics(store: UserStore): void {
  const acts = store.activities;
  const totalActs = acts.length;

  if (totalActs > 0) {
    let emailCount = 0;
    let aiCount = 0;
    let storageCount = 0;
    let searchCount = 0;

    let emailCarbon = 0;
    let aiCarbon = 0;
    let storageCarbon = 0;
    let searchCarbon = 0;

    const daysMap: Record<string, { cost: number; carbon: number }> = {
      Mon: { cost: 0, carbon: 0 },
      Tue: { cost: 0, carbon: 0 },
      Wed: { cost: 0, carbon: 0 },
      Thu: { cost: 0, carbon: 0 },
      Fri: { cost: 0, carbon: 0 },
      Sat: { cost: 0, carbon: 0 },
      Sun: { cost: 0, carbon: 0 },
    };

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (const a of acts) {
      if (a.type === "email") {
        emailCount++;
        emailCarbon += a.carbonKg;
      } else if (a.type === "ai") {
        aiCount++;
        aiCarbon += a.carbonKg;
      } else if (a.type === "storage") {
        storageCount++;
        storageCarbon += a.carbonKg;
      } else if (a.type === "search") {
        searchCount++;
        searchCarbon += a.carbonKg;
      }

      const dateObj = new Date(a.timestamp);
      const dayName = isNaN(dateObj.getTime()) ? "Mon" : dayNames[dateObj.getDay()];
      if (daysMap[dayName]) {
        daysMap[dayName].cost += a.costINR;
        daysMap[dayName].carbon += a.carbonKg;
      }
    }

    // Usage Distribution (% breakdown)
    const emailPct = Math.round((emailCount / totalActs) * 100);
    const aiPct = Math.round((aiCount / totalActs) * 100);
    const storagePct = Math.round((storageCount / totalActs) * 100);
    const searchPct = Math.max(0, 100 - emailPct - aiPct - storagePct);

    store.distribution = [
      { name: "Email", value: emailPct, color: "#3b82f6" },
      { name: "AI Usage", value: aiPct, color: "#8b5cf6" },
      { name: "Storage", value: storagePct, color: "#10b981" },
      { name: "Search", value: searchPct, color: "#f59e0b" },
    ];

    // Time series (last 7 days ordered Mon - Sun)
    store.timeSeries = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => ({
      date: d,
      cost: parseFloat(daysMap[d].cost.toFixed(2)),
      carbon: parseFloat(daysMap[d].carbon.toFixed(4)),
    }));

    // Category breakdown score: 100 - penalties + savings boost
    const calcScore = (carbon: number) => {
      const penalty = Math.min(60, Math.floor(carbon * 100));
      return Math.max(20, Math.min(100, 95 - penalty));
    };

    store.breakdown = {
      email: calcScore(emailCarbon),
      ai: calcScore(aiCarbon),
      storage: calcScore(storageCarbon),
      search: calcScore(searchCarbon),
    };

    // Overall sustainability score
    const avgScore = Math.round(
      (store.breakdown.email +
        store.breakdown.ai +
        store.breakdown.storage +
        store.breakdown.search) / 4
    );
    store.sustainabilityScore = avgScore;
  }
}

/**
 * Get the data store for a specific user.
 * Creates a new one if it doesn't exist.
 */
export const getStore = (userId: string = "default"): UserStore => {
  if (!userStores[userId]) {
    userStores[userId] = createInitialStore();
  }
  return userStores[userId];
};

// Legacy exports for backward compatibility (reseeded with default store)
const defaultStore = getStore("default");
export const activities = defaultStore.activities;
export const kpi = defaultStore.kpi;
export const timeSeries = defaultStore.timeSeries;
export const distribution = defaultStore.distribution;
export const suggestions = defaultStore.suggestions;
export const sustainabilityScore = defaultStore.sustainabilityScore;
export const breakdown = defaultStore.breakdown;
export const settings = defaultStore.settings;
