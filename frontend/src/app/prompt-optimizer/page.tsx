"use client";

import { useState } from "react";
import {
  Sparkles,
  Zap,
  Leaf,
  Copy,
  Check,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { shortenPromptAPI } from "@/lib/api";
import { CompressionIntensity, CompressionResult } from "@/lib/types";
import { useAppStore } from "@/store/use-app-store";

const SAMPLE_PROMPTS = [
  {
    title: "Wordy Python Query",
    text: "Hello ChatGPT! Could you please kindly help me write a comprehensive Python script that is able to parse nested JSON files step by step? Make sure to include error handling. Thank you so much in advance!",
  },
  {
    title: "Verbose Marketing Request",
    text: "Hi there! I was wondering if you could provide a detailed explanation of social media marketing strategies for eco-friendly products. Please make sure that you give a list of all actionable tips and tricks. I would really appreciate your help!",
  },
  {
    title: "Polite Technical Review",
    text: "Greetings assistant! In order to improve our backend performance, could you take into consideration our Express.js architecture and conduct an investigation into potential memory leaks? At the present time we see high memory usage. Thanks!",
  },
];

export default function PromptOptimizerPage() {
  const [prompt, setPrompt] = useState("");
  const [intensity, setIntensity] = useState<CompressionIntensity>("balanced");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = useAppStore((s) => s.userId);

  const handleCompress = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await shortenPromptAPI(
        prompt,
        intensity,
        userId || undefined,
        true
      );
      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to shorten prompt. Please check backend.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.shortenedPrompt) return;
    navigator.clipboard.writeText(result.shortenedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const estTokens = Math.ceil(prompt.trim().length / 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">AI Prompt Shortener</h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">
              <Leaf className="mr-1 h-3 w-3" /> Green ML
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Compress conversational prompts, eliminate token bloat, and cut AI carbon emissions.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Original Prompt</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {prompt.length} chars • ~{estTokens} tokens
                </div>
              </div>
              <CardDescription>
                Paste your lengthy prompt or try a sample below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Paste your prompt here (e.g., 'Hello ChatGPT, can you please kindly...')"
                rows={7}
                className="w-full resize-none rounded-lg border bg-background p-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              {/* Sample Prompts */}
              <div>
                <span className="text-xs font-medium text-muted-foreground">Try a sample:</span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {SAMPLE_PROMPTS.map((sample, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setPrompt(sample.text);
                        setResult(null);
                      }}
                    >
                      {sample.title}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Intensity Selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Compression Mode
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "conservative", label: "Conservative", desc: "Strip fluff (~25%)" },
                      { id: "balanced", label: "Balanced", desc: "Streamline (~45%)" },
                      { id: "aggressive", label: "Aggressive", desc: "Dense core (~65%)" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setIntensity(m.id)}
                      className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-all ${
                        intensity === m.id
                          ? "border-emerald-500 bg-emerald-500/10 font-medium text-emerald-500"
                          : "border-border hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      <span className="text-xs font-semibold">{m.label}</span>
                      <span className="text-[10px] opacity-80">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-500">
                  {error}
                </div>
              )}

              <Button
                onClick={handleCompress}
                disabled={loading || !prompt.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Shortening Prompt...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Shorten & Save Carbon
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Output Column */}
        <div className="space-y-4">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Shortened Output</CardTitle>
                {result && (
                  <Badge variant="secondary" className="text-xs">
                    <Cpu className="mr-1 h-3 w-3" />
                    {result.method === "gemini-neural" ? "Gemini Neural" : "Local ML/NLP"}
                  </Badge>
                )}
              </div>
              <CardDescription>
                High-density prompt with preserved semantics and minimum token footprint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
              {result ? (
                <>
                  <div className="relative flex-1">
                    <textarea
                      readOnly
                      value={result.shortenedPrompt}
                      rows={7}
                      className="w-full resize-none rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm focus:outline-none"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleCopy}
                      className="absolute right-2 top-2 h-8 gap-1.5 text-xs"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Metrics Banner */}
                  <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center">
                    <div>
                      <div className="text-[11px] text-muted-foreground">Tokens Saved</div>
                      <div className="text-base font-bold text-emerald-500">
                        {result.tokensSaved}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          ({result.reductionPercentage}%)
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Carbon Avoided</div>
                      <div className="text-base font-bold text-emerald-500">
                        {(result.carbonSavedKg * 1000).toFixed(2)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">g CO₂</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Cost Saved</div>
                      <div className="text-base font-bold text-emerald-500">
                        ₹ {result.costSavedINR.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    🌱 Savings have been logged to your dashboard & live tracker!
                  </p>
                </>
              ) : (
                <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed text-center p-6 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mb-2 opacity-40 text-emerald-500" />
                  <p className="text-sm font-medium">No prompt compressed yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Enter a prompt or select a sample on the left, then click Shorten.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Methodology Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" /> Why AI Prompt Shortening Matters
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground grid sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="font-semibold text-foreground">Token Reduction</span>
            <p>
              LLM attention mechanisms scale quadratically with context length. Cutting redundant tokens directly decreases server GPU compute time.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-foreground">Local Grid Factor</span>
            <p>
              Under India’s grid carbon intensity (0.7 kg CO₂/kWh, PUE 1.2), saving ~100 tokens avoids ~0.0025 kg CO₂ from hyperscale data centers.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-foreground">Zero Quality Loss</span>
            <p>
              Pruning conversational pleasantries and filler maintains 100% of the instruction accuracy while optimizing response latency.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
