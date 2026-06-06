"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calculator, TrendingUp, AlertCircle, Sparkles, ChevronDown, ChevronUp,
  Zap, DollarSign, Users, MessageSquare,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MODELS, PROVIDERS } from "@/lib/models";
import { formatCurrency, cn } from "@/lib/utils";

// ── Paid pricing anchors (USD / 1M tokens, as of 2026-05) ─────────────────────
const PAID_ANCHORS = [
  // OpenAI
  { name: "GPT-4.1",           in: 2.00,  out: 8.00,  vendor: "OpenAI",     rateLimit: "10K RPM" },
  { name: "GPT-4o",            in: 2.50,  out: 10.00, vendor: "OpenAI",     rateLimit: "5K RPM" },
  { name: "GPT-4o mini",       in: 0.15,  out: 0.60,  vendor: "OpenAI",     rateLimit: "30K RPM" },
  { name: "o3",                in: 10.00, out: 40.00, vendor: "OpenAI",     rateLimit: "2K RPM" },
  { name: "o4-mini",           in: 1.10,  out: 4.40,  vendor: "OpenAI",     rateLimit: "5K RPM" },
  // Anthropic
  { name: "Claude 4 Sonnet",   in: 3.00,  out: 15.00, vendor: "Anthropic",  rateLimit: "5K RPM" },
  { name: "Claude 3.7 Sonnet", in: 3.00,  out: 15.00, vendor: "Anthropic",  rateLimit: "5K RPM" },
  { name: "Claude 3.5 Haiku",  in: 0.80,  out: 4.00,  vendor: "Anthropic",  rateLimit: "5K RPM" },
  { name: "Claude 3 Haiku",    in: 0.25,  out: 1.25,  vendor: "Anthropic",  rateLimit: "5K RPM" },
  // Google
  { name: "Gemini 2.5 Pro",    in: 1.25,  out: 10.00, vendor: "Google",     rateLimit: "2K RPM" },
  { name: "Gemini 2.5 Flash",  in: 0.15,  out: 0.60,  vendor: "Google",     rateLimit: "4K RPM" },
  // Meta / xAI
  { name: "Llama 4 Maverick (hosted)", in: 0.27, out: 0.85, vendor: "Meta", rateLimit: "Varies" },
  { name: "Grok 3",            in: 3.00,  out: 15.00, vendor: "xAI",        rateLimit: "1K RPM" },
  // Mistral
  { name: "Mistral Large 2",   in: 2.00,  out: 6.00,  vendor: "Mistral",    rateLimit: "5K RPM" },
  { name: "Codestral",         in: 0.20,  out: 0.60,  vendor: "Mistral",    rateLimit: "5K RPM" },
] as const;

// ── Usage presets ─────────────────────────────────────────────────────────────
const PRESETS = [
  { label: "Chatbot",     icon: <MessageSquare className="h-4 w-4" />, users: 1_000,  req: 5,  inp: 800,  out: 400  },
  { label: "Code Assist", icon: <Zap className="h-4 w-4" />,          users: 500,   req: 20, inp: 2000, out: 1000 },
  { label: "Enterprise",  icon: <Users className="h-4 w-4" />,        users: 10_000, req: 10, inp: 1200, out: 600  },
  { label: "High Volume", icon: <TrendingUp className="h-4 w-4" />,   users: 50_000, req: 3,  inp: 500,  out: 250  },
];

interface CalcRow {
  name: string;
  vendor: string;
  provider: string;
  color: string;
  cost: number;
  free: boolean;
  rateLimit?: string;
}

export default function CalculatorPage() {
  const [users,       setUsers]       = useState(1_000);
  const [reqPerUser,  setReqPerUser]  = useState(5);
  const [inputTokens, setInputTokens] = useState(800);
  const [outputTokens,setOutputTokens]= useState(400);
  const [showAll,     setShowAll]     = useState(false);

  const monthlyRequests = users * reqPerUser * 30;

  const rows = useMemo((): CalcRow[] => {
    const freeRows: CalcRow[] = MODELS
      .filter(m => m.free)
      .sort((a, b) => (b.benchmark ?? 0) - (a.benchmark ?? 0))
      .map(m => ({
        name: m.name,
        vendor: m.vendor,
        provider: PROVIDERS[m.provider].name,
        color: PROVIDERS[m.provider].color,
        cost: ((m.inputPrice * inputTokens + m.outputPrice * outputTokens) * monthlyRequests) / 1_000_000,
        free: true,
        rateLimit: "~30–1000 RPM",
      }));

    const paidRows: CalcRow[] = PAID_ANCHORS.map(m => ({
      name: m.name,
      vendor: m.vendor,
      provider: m.vendor,
      color: "#94A3B8",
      cost: ((m.in * inputTokens + m.out * outputTokens) * monthlyRequests) / 1_000_000,
      free: false,
      rateLimit: m.rateLimit,
    }));

    return [...freeRows, ...paidRows].sort((a, b) => a.cost - b.cost);
  }, [inputTokens, outputTokens, monthlyRequests]);

  const cheapestPaid  = rows.find(r => !r.free);
  const savings       = cheapestPaid?.cost ?? 0;
  const displayedRows = showAll ? rows : rows.slice(0, 12);

  function applyPreset(p: typeof PRESETS[number]) {
    setUsers(p.users);
    setReqPerUser(p.req);
    setInputTokens(p.inp);
    setOutputTokens(p.out);
  }

  // top 15 for bar chart — skip rows with 0 cost (free)
  const chartRows = rows.filter(r => r.cost > 0 || r.free).slice(0, 16);

  return (
    <div className="container max-w-7xl py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <Calculator className="h-5 w-5 text-violet-500" />
          <span className="text-xs font-semibold text-violet-500 uppercase tracking-wider">Cost Calculator</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Project your monthly LLM spend</h1>
        <p className="mt-2 text-muted-foreground">
          Compare {MODELS.filter(m => m.free).length} free models against {PAID_ANCHORS.length} paid alternatives. Numbers update live.
        </p>
      </motion.div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-xs text-muted-foreground self-center mr-1">Quick presets:</span>
        {PRESETS.map(p => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            onClick={() => applyPreset(p)}
            className="gap-1.5 text-xs"
          >
            {p.icon} {p.label}
          </Button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sliders */}
        <Card className="lg:col-span-1 h-fit sticky top-20">
          <CardHeader>
            <CardTitle className="text-base">Workload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ControlSlider
              label="Daily active users"
              value={users}
              onChange={setUsers}
              min={10}
              max={100_000}
              step={10}
              format={v => v.toLocaleString("en-US")}
            />
            <ControlSlider
              label="Requests / user / day"
              value={reqPerUser}
              onChange={setReqPerUser}
              min={1}
              max={100}
              step={1}
            />
            <ControlSlider
              label="Input tokens / request"
              value={inputTokens}
              onChange={setInputTokens}
              min={100}
              max={16_000}
              step={100}
            />
            <ControlSlider
              label="Output tokens / request"
              value={outputTokens}
              onChange={setOutputTokens}
              min={50}
              max={8_000}
              step={50}
            />

            <div className="pt-4 border-t space-y-1">
              <p className="text-xs text-muted-foreground">Monthly request volume</p>
              <p className="text-2xl font-bold">{monthlyRequests.toLocaleString("en-US")}</p>
              <p className="text-xs text-muted-foreground">
                {(monthlyRequests * inputTokens / 1_000_000).toFixed(1)}M input · {(monthlyRequests * outputTokens / 1_000_000).toFixed(1)}M output tokens
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Savings hero */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-5 flex items-center gap-4 flex-wrap">
              <div className="h-12 w-12 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Free models cost you</p>
                <p className="text-2xl font-bold text-emerald-600">$0 / month</p>
                <p className="text-xs text-muted-foreground">{MODELS.filter(m => m.free).length} models available at $0</p>
              </div>
              {savings > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">vs cheapest paid ({cheapestPaid?.name})</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(savings, savings > 1000 ? 0 : savings > 100 ? 0 : 2)}
                    <span className="text-sm font-normal text-muted-foreground">/mo saved</span>
                  </p>
                  {savings > 10_000 && (
                    <p className="text-xs text-emerald-600 font-semibold">
                      {formatCurrency(savings * 12, 0)}/yr saved
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Cost comparison (lowest first)</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Free
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="h-2.5 w-2.5 rounded-sm bg-slate-400" /> Paid
                  </span>
                  <Badge variant="outline" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />Live
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} layout="vertical" margin={{ left: 16, right: 60, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickFormatter={v => formatCurrency(v, 0)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      width={140}
                      tickFormatter={v => v.length > 20 ? v.slice(0, 19) + "…" : v}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(v: number) => [
                        formatCurrency(v, v > 100 ? 0 : 2) + " / month",
                        "Cost",
                      ]}
                    />
                    <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                      {chartRows.map((r, i) => (
                        <Cell key={i} fill={r.free ? "#10B981" : "#94A3B8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Full Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium">Model</th>
                      <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Provider</th>
                      <th className="px-3 py-2.5 font-medium text-center">Access</th>
                      <th className="px-3 py-2.5 font-medium text-right">Monthly Cost</th>
                      <th className="px-3 py-2.5 font-medium text-right hidden lg:table-cell">Rate Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.map((r, i) => (
                      <tr
                        key={i}
                        className={cn(
                          "border-b last:border-0 transition-colors",
                          r.free ? "hover:bg-emerald-500/5" : "hover:bg-accent/30",
                        )}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {r.free && (
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                            )}
                            <span className={cn("font-medium truncate", !r.free && "pl-3.5")}>
                              {r.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs hidden md:table-cell">{r.provider}</td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant={r.free ? "success" : "outline"} className="text-[10px]">
                            {r.free ? "FREE" : "PAID"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={cn(
                            "font-semibold text-sm tabular-nums",
                            r.free ? "text-emerald-600" : "",
                          )}>
                            {r.free
                              ? "$0"
                              : formatCurrency(r.cost, r.cost > 1000 ? 0 : r.cost > 100 ? 0 : 2)
                            }
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-muted-foreground hidden lg:table-cell">
                          {r.rateLimit ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rows.length > 12 && (
                <div className="p-3 border-t flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAll(v => !v)}
                    className="gap-1.5 text-xs"
                  >
                    {showAll ? (
                      <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5" /> Show all {rows.length} models</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost savings summary */}
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              {
                label: "vs GPT-4o",
                anchor: PAID_ANCHORS.find(a => a.name === "GPT-4o"),
                color: "text-blue-600",
              },
              {
                label: "vs Claude 4 Sonnet",
                anchor: PAID_ANCHORS.find(a => a.name === "Claude 4 Sonnet"),
                color: "text-violet-600",
              },
              {
                label: "vs Gemini 2.5 Pro",
                anchor: PAID_ANCHORS.find(a => a.name === "Gemini 2.5 Pro"),
                color: "text-amber-600",
              },
            ].map(({ label, anchor, color }) => {
              if (!anchor) return null;
              const paidCost = ((anchor.in * inputTokens + anchor.out * outputTokens) * monthlyRequests) / 1_000_000;
              return (
                <Card key={label} className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={cn("text-xl font-bold", color)}>
                      {formatCurrency(paidCost, paidCost > 1000 ? 0 : 0)}/mo
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Free saves <span className="text-emerald-600 font-semibold">
                        {formatCurrency(paidCost, paidCost > 1000 ? 0 : 0)}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-muted/30">
            <CardContent className="p-4 flex items-start gap-3 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
              <p>
                Free tiers carry rate limits (typically 30–1000 req/min). For workloads above ~10K daily requests,
                split traffic across providers with BYOK, use a gateway, or tier up.
                All free models can be combined — Groq for speed, OpenRouter for variety, NVIDIA for cutting-edge.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ControlSlider({
  label, value, onChange, min, max, step, format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-mono font-semibold tabular-nums">
          {format ? format(value) : value.toLocaleString("en-US")}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
