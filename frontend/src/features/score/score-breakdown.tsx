"use client";

import { motion } from "framer-motion";
import { Mail, Bot, HardDrive, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/use-app-store";

const categories = [
  {
    key: "email" as const,
    label: "Email Efficiency",
    icon: Mail,
    color: "#3b82f6",
    description: "Attachment compression, unsubscribes, and send optimization",
  },
  {
    key: "ai" as const,
    label: "AI Usage Efficiency",
    icon: Bot,
    color: "#8b5cf6",
    description: "Prompt caching, model selection, and token optimization",
  },
  {
    key: "storage" as const,
    label: "Storage Efficiency",
    icon: HardDrive,
    color: "#10b981",
    description: "Deduplication, lazy sync, and cleanup of unused files",
  },
  {
    key: "search" as const,
    label: "Search Efficiency",
    icon: Search,
    color: "#f59e0b",
    description: "Targeted queries, query refinement, and cache utilization",
  },
];

export function ScoreBreakdown() {
  const breakdown = useAppStore((s) => s.breakdown);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Score Breakdown</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat, i) => {
          const score = breakdown[cat.key];
          const barColor =
            score >= 75
              ? "bg-emerald-500"
              : score >= 50
                ? "bg-amber-500"
                : "bg-red-500";

          return (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${cat.color}15` }}
                    >
                      <cat.icon
                        className="h-4 w-4"
                        style={{ color: cat.color }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cat.label}</p>
                      <p className="text-2xl font-bold">{score}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className={`h-full rounded-full ${barColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.15 }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    {cat.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
