import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (amount < 0) return `-₹${Math.abs(amount).toFixed(2)}`;
  return `₹${amount.toFixed(2)}`;
}

export function formatCarbon(kg: number): string {
  const isNegative = kg < 0;
  const absKg = Math.abs(kg);
  let formatted = "";
  if (absKg < 0.001) formatted = `${(absKg * 1_000_000).toFixed(1)}mg`;
  else if (absKg < 1) formatted = `${(absKg * 1000).toFixed(1)}g`;
  else formatted = `${absKg.toFixed(2)}kg`;
  return isNegative ? `-${formatted}` : formatted;
}

export function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function getImpactColor(impact: string): string {
  switch (impact) {
    case "high":
      return "text-red-500 bg-red-500/10 border-red-500/20";
    case "medium":
      return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    case "low":
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    default:
      return "text-muted-foreground bg-muted";
  }
}

export function getActivityIcon(type: string): string {
  switch (type) {
    case "email":
      return "Mail";
    case "ai":
      return "Bot";
    case "storage":
      return "HardDrive";
    default:
      return "Activity";
  }
}
