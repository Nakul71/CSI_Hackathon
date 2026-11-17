"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/store/use-app-store";

export function UsagePieChart() {
  const distribution = useAppStore((s) => s.distribution);
  const totalValue = distribution.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usage Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[280px]">
          {totalValue === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="h-28 w-28 rounded-full border-4 border-dashed border-muted flex items-center justify-center text-xs text-muted-foreground">
                No activity
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Track activities to view distribution
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value) => [`${value}%`, "Usage"]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Legend */}
        <div className="flex justify-center gap-6">
          {distribution.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground">
                {entry.name} ({entry.value}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
