"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mail, Bot, HardDrive, Clock, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/store/use-app-store";
import { formatCurrency, formatCarbon } from "@/lib/utils";
import { ActivityType } from "@/lib/types";

const iconMap: Record<ActivityType, typeof Mail> = {
  email: Mail,
  ai: Bot,
  storage: HardDrive,
  search: Search,
};

const colorMap: Record<ActivityType, string> = {
  email: "text-blue-500 bg-blue-500/10",
  ai: "text-violet-500 bg-violet-500/10",
  storage: "text-emerald-500 bg-emerald-500/10",
  search: "text-amber-500 bg-amber-500/10",
};

function timeAgo(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "just now";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ActivityFeed() {
  const activities = useAppStore((s) => s.activities);
  const displayActivities = activities.slice(0, 8);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Live Activity Feed</CardTitle>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs text-muted-foreground">Real-time</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {displayActivities.map((activity) => {
                const Icon = iconMap[activity.type];
                const color = colorMap[activity.type];

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{timeAgo(activity.timestamp)}</span>
                        <span className="text-muted-foreground/50">|</span>
                        <span>{activity.size}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <p className="text-sm font-medium">
                              {formatCurrency(activity.costINR)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCarbon(activity.carbonKg)}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Cost: {formatCurrency(activity.costINR)} | CO₂:{" "}
                            {formatCarbon(activity.carbonKg)}
                          </p>
                          <p className="text-xs opacity-75">
                            Based on data center energy estimates
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
