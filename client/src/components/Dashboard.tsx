import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Droplets,
  Users,
  Flame,
  Lock,
  Activity,
  Clock,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import type { TokenMetrics, PricePoint } from "@shared/schema";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface DashboardProps {
  metrics: TokenMetrics | null;
  priceHistory: PricePoint[];
  isLoading: boolean;
  isConnected: boolean;
}

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  color?: string;
  isLoading?: boolean;
}

function StatCard({ title, value, change, icon, color = "text-primary", isLoading }: StatCardProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setIsPulsing(true);
      prevValue.current = value;
      const timer = setTimeout(() => setIsPulsing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [value]);

  if (isLoading) {
    return (
      <Card className="p-4 lg:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 lg:p-6 transition-all ${isPulsing ? "animate-data-pulse" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className={`text-2xl lg:text-3xl font-mono font-bold tabular-nums ${color}`}>
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-chart-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={`text-xs font-mono ${
                  change >= 0 ? "text-chart-1" : "text-destructive"
                }`}
              >
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-2 rounded-md bg-muted ${color}`}>{icon}</div>
      </div>
    </Card>
  );
}

export function Dashboard({ metrics, priceHistory, isLoading, isConnected }: DashboardProps) {
  const formatPrice = (price: number) => {
    if (price < 0.001) {
      return `$${price.toFixed(8)}`;
    }
    return `$${price.toFixed(6)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(2)}B`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toFixed(0);
  };

  const priceChartData = {
    labels: priceHistory.map((p) => {
      const date = new Date(p.timestamp);
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }),
    datasets: [
      {
        label: "Price",
        data: priceHistory.map((p) => p.price),
        borderColor: "hsl(142 72% 45%)",
        backgroundColor: "hsl(142 72% 45% / 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const priceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: "hsl(120 6% 12%)",
        titleColor: "hsl(120 5% 90%)",
        bodyColor: "hsl(120 5% 90%)",
        borderColor: "hsl(120 5% 18%)",
        borderWidth: 1,
        titleFont: { family: "JetBrains Mono, monospace" },
        bodyFont: { family: "JetBrains Mono, monospace" },
      },
    },
    scales: {
      x: {
        display: true,
        grid: { color: "hsl(120 5% 18% / 0.5)", drawBorder: false },
        ticks: {
          color: "hsl(120 3% 55%)",
          font: { family: "JetBrains Mono, monospace", size: 10 },
          maxTicksLimit: 6,
        },
      },
      y: {
        display: true,
        grid: { color: "hsl(120 5% 18% / 0.5)", drawBorder: false },
        ticks: {
          color: "hsl(120 3% 55%)",
          font: { family: "JetBrains Mono, monospace", size: 10 },
          callback: function (value: any) {
            return formatPrice(value);
          },
        },
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };

  const burnProgress = metrics
    ? (metrics.burnedTokens / metrics.totalSupply) * 100
    : 0;

  const supplyData = metrics
    ? {
        labels: ["Circulating", "Burned", "Locked"],
        datasets: [
          {
            data: [
              metrics.circulatingSupply,
              metrics.burnedTokens,
              metrics.lockedTokens,
            ],
            backgroundColor: [
              "hsl(142 72% 45%)",
              "hsl(0 72% 50%)",
              "hsl(45 90% 50%)",
            ],
            borderColor: ["transparent", "transparent", "transparent"],
            borderWidth: 0,
          },
        ],
      }
    : null;

  const supplyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: {
          color: "hsl(120 3% 55%)",
          font: { family: "JetBrains Mono, monospace", size: 11 },
          padding: 16,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "hsl(120 6% 12%)",
        titleColor: "hsl(120 5% 90%)",
        bodyColor: "hsl(120 5% 90%)",
        borderColor: "hsl(120 5% 18%)",
        borderWidth: 1,
        titleFont: { family: "JetBrains Mono, monospace" },
        bodyFont: { family: "JetBrains Mono, monospace" },
        callbacks: {
          label: function (context: any) {
            return `${context.label}: ${formatNumber(context.parsed)}`;
          },
        },
      },
    },
    cutout: "70%",
  };

  return (
    <section id="dashboard" className="py-8 lg:py-12 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl lg:text-3xl font-mono font-bold uppercase tracking-tight">
              LIVE DASHBOARD
            </h2>
            <p className="text-sm text-muted-foreground font-mono mt-1">
              Real-time $NORMIE metrics from Solana
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-chart-1 animate-pulse" : "bg-destructive"
              }`}
            />
            <span className="text-xs font-mono text-muted-foreground">
              {isConnected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Price"
            value={metrics ? formatPrice(metrics.price) : "$0.00"}
            change={metrics?.priceChange24h}
            icon={<DollarSign className="h-5 w-5" />}
            isLoading={isLoading}
          />
          <StatCard
            title="Market Cap"
            value={metrics ? `$${formatNumber(metrics.marketCap)}` : "$0"}
            change={metrics?.marketCapChange24h}
            icon={<BarChart3 className="h-5 w-5" />}
            isLoading={isLoading}
          />
          <StatCard
            title="24h Volume"
            value={metrics ? `$${formatNumber(metrics.volume24h)}` : "$0"}
            icon={<Activity className="h-5 w-5" />}
            color="text-chart-2"
            isLoading={isLoading}
          />
          <StatCard
            title="Liquidity"
            value={metrics ? `$${formatNumber(metrics.liquidity)}` : "$0"}
            icon={<Droplets className="h-5 w-5" />}
            color="text-chart-3"
            isLoading={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Holders"
            value={metrics ? formatNumber(metrics.holders) : "0"}
            icon={<Users className="h-5 w-5" />}
            color="text-chart-4"
            isLoading={isLoading}
          />
          <StatCard
            title="Burned"
            value={metrics ? formatNumber(metrics.burnedTokens) : "0"}
            icon={<Flame className="h-5 w-5" />}
            color="text-destructive"
            isLoading={isLoading}
          />
          <StatCard
            title="Locked"
            value={metrics ? formatNumber(metrics.lockedTokens) : "0"}
            icon={<Lock className="h-5 w-5" />}
            color="text-chart-3"
            isLoading={isLoading}
          />
          <StatCard
            title="Circulating"
            value={metrics ? formatNumber(metrics.circulatingSupply) : "0"}
            icon={<Activity className="h-5 w-5" />}
            isLoading={isLoading}
          />
        </div>

        <Card className="p-4 lg:p-6 mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                Supply Stranglehold
              </h3>
              <p className="text-lg font-mono font-bold">
                {burnProgress.toFixed(1)}% Removed
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-destructive">
              <Flame className="h-3 w-3 mr-1" />
              {metrics ? formatNumber(metrics.burnedTokens) : "0"} BURNED
            </Badge>
          </div>
          <Progress value={burnProgress} className="h-3" />
          <div className="flex justify-between mt-2 text-xs font-mono text-muted-foreground">
            <span>0%</span>
            <span>572M removed total</span>
            <span>100%</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-4 lg:p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                Price Chart
              </h3>
              {metrics && (
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(metrics.lastUpdated).toLocaleTimeString()}
                </div>
              )}
            </div>
            <div className="h-64 lg:h-80">
              {priceHistory.length > 0 ? (
                <Line data={priceChartData} options={priceChartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 lg:p-6">
            <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
              Supply Distribution
            </h3>
            <div className="h-64 flex items-center justify-center">
              {supplyData ? (
                <Doughnut data={supplyData} options={supplyChartOptions} />
              ) : (
                <Skeleton className="h-48 w-48 rounded-full" />
              )}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
