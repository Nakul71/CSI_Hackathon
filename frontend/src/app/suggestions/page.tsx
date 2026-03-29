"use client";

import { useEffect } from "react";
import { Lightbulb, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { SuggestionsList } from "@/features/suggestions/suggestions-list";
import { Button } from "@/components/ui/button";

export default function SuggestionsPage() {
  const fetchSuggestionsData = useAppStore((s) => s.fetchSuggestionsData);
  const loading = useAppStore((s) => s.loading);
  const error = useAppStore((s) => s.error);
  const suggestions = useAppStore((s) => s.suggestions);

  useEffect(() => {
    fetchSuggestionsData();
  }, [fetchSuggestionsData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
          <Lightbulb className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Optimization Suggestions</h1>
          <p className="text-sm text-muted-foreground">
            Actionable recommendations to reduce your digital footprint
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Generating AI suggestions…</p>
        </div>
      ) : error && suggestions.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-sm text-muted-foreground">
            Could not load suggestions. Please try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSuggestionsData()}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : (
        <SuggestionsList />
      )}
    </div>
  );
}

