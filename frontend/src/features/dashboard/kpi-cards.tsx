"use client";

import { motion } from "framer-motion";
import {
  IndianRupee,
  Leaf,
  Mail,
  Bot,
  TrendingDown,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/store/use-app-store";
import { formatCurrency, formatCarbon } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function KPICards() {
  const kpi = useAppStore((s) => s.kpi);

  const cards = [
    {
      title: "Total Cost Saved",
      value: formatCurrency(kpi.totalCostSaved),
      icon: IndianRupee,
      change: "+12.5%",
      tooltip:
        "Estimated cost savings from optimized email, reduced AI tokens, and storage cleanup",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Total CO₂ Saved",
      value: formatCarbon(kpi.totalCO2Saved),
      icon: Leaf,
      change: "+8.2%",
      tooltip:
        "CO₂ emissions prevented by digital activity optimizations. Based on average data center energy consumption.",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Emails Optimized",
      value: kpi.emailsOptimized.toString(),
      icon: Mail,
      change: "+24",
      tooltip:
        "Emails compressed, attachments optimized, or unnecessary sends prevented",
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      title: "AI Usage Reduced",
      value:
        kpi.aiUsageReduced >= 10
          ? `${kpi.aiUsageReduced.toFixed(0)} tokens`
          : `${kpi.aiUsageReduced.toFixed(0)}%`,
      icon: Bot,
      change: "-3.1%",
      tooltip:
        "Reduction in AI token usage through prompt compression, pruning, and optimization",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <TooltipProvider>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map((card) => (
          <motion.div key={card.title} variants={item}>
            <Card className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}
                  >
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[200px]">
                      <p>{card.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{card.value}</p>
                    <span className="flex items-center text-xs text-emerald-500">
                      <TrendingDown className="mr-0.5 h-3 w-3" />
                      {card.change}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </TooltipProvider>
  );
}
