import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { FounderWalletCards } from "@/components/FounderWalletCards";
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
  AlertTriangle,
  ExternalLink,
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
import type { TokenMetrics, PricePoint, DevBuy } from "@shared/schema";

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
  devBuys: DevBuy[];
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
  subtitle?: string;
}

function StatCard({ title, value, change, icon, color = "text-primary", isLoading, subtitle }: StatCardProps) {
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
          {subtitle && (
            <p className="text-xs font-mono text-muted-foreground underline underline-offset-2">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-md bg-muted ${color}`}>{icon}</div>
      </div>
    </Card>
  );
}

const TIME_RANGES = [
  { id: "live", label: "Live", description: "Real-time updates" },
  { id: "5m", label: "5m", description: "Last 5 minutes" },
  { id: "1h", label: "1h", description: "Last hour" },
  { id: "6h", label: "6h", description: "Last 6 hours" },
  { id: "24h", label: "24h", description: "Last 24 hours" },
  { id: "7d", label: "7d", description: "Last 7 days" },
  { id: "all", label: "All", description: "All time history" },
];

interface ChartMarker {
  type: "dev" | "whale";
  signature: string;
  timestamp: number;
  amount: number;
  price: number;
  walletAddress?: string;
  percentOfSupply?: number;
}

export function Dashboard({ metrics, priceHistory, devBuys, isLoading, isConnected }: DashboardProps) {
  const { user, isAuthenticated } = useAuth();
  const isFounder = user?.role === "founder";
  
  const [timeRange, setTimeRange] = useState("24h");
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const lastFetchRef = useRef<{ range: string; timestamp: number } | null>(null);
  const chartDataRef = useRef<PricePoint[]>([]);
  const [chartMarkers, setChartMarkers] = useState<ChartMarker[]>([]);

  const fetchChartData = useCallback(async (range: string, force = false) => {
    if (range === "live") {
      const sorted = [...priceHistory].sort((a, b) => a.timestamp - b.timestamp);
      setChartData(sorted);
      chartDataRef.current = sorted;
      return;
    }
    
    const now = Date.now();
    const lastFetch = lastFetchRef.current;
    
    if (!force && lastFetch && lastFetch.range === range && now - lastFetch.timestamp < 30000) {
      return;
    }
    
    setIsLoadingChart(true);
    try {
      const response = await fetch(`/api/price-history?range=${range}`);
      if (response.ok) {
        const data: PricePoint[] = await response.json();
        const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
        
        if (chartDataRef.current.length > 0 && sorted.length > 0 && chartDataRef.current.length === sorted.length) {
          const oldFirst = chartDataRef.current[0];
          const oldLast = chartDataRef.current[chartDataRef.current.length - 1];
          const newFirst = sorted[0];
          const newLast = sorted[sorted.length - 1];
          
          const isSame = oldFirst.timestamp === newFirst.timestamp &&
                         oldLast.timestamp === newLast.timestamp &&
                         oldFirst.price === newFirst.price &&
                         oldLast.price === newLast.price;
          
          if (isSame) {
            setIsLoadingChart(false);
            return;
          }
        }
        
        chartDataRef.current = sorted;
        setChartData(sorted);
        lastFetchRef.current = { range, timestamp: now };
      }
    } catch (error) {
      console.error("[Chart] Error fetching historical data:", error);
      const sorted = [...priceHistory].sort((a, b) => a.timestamp - b.timestamp);
      setChartData(sorted);
      chartDataRef.current = sorted;
    } finally {
      setIsLoadingChart(false);
    }
  }, [priceHistory]);

  useEffect(() => {
    fetchChartData(timeRange, true);
    
    if (timeRange !== "live") {
      const refreshInterval = setInterval(() => {
        fetchChartData(timeRange, true);
      }, 60000);
      
      return () => clearInterval(refreshInterval);
    }
  }, [timeRange, fetchChartData]);
  
  useEffect(() => {
    if (timeRange === "live" && priceHistory.length > 0) {
      const sorted = [...priceHistory].sort((a, b) => a.timestamp - b.timestamp);
      setChartData(sorted);
      chartDataRef.current = sorted;
    }
  }, [priceHistory, timeRange]);

  // Fetch chart markers (whale buys + stored dev buys) when time range changes
  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const apiRange = timeRange === "live" ? "24h" : timeRange;
        const response = await fetch(`/api/chart-markers?range=${apiRange}`);
        if (response.ok) {
          const markers: ChartMarker[] = await response.json();
          setChartMarkers(markers);
        }
      } catch (error) {
        console.error("[Chart] Error fetching markers:", error);
      }
    };
    fetchMarkers();
  }, [timeRange]);

  const formatPrice = (price: number) => {
    if (price < 0.00001) {
      return price.toFixed(10);
    }
    if (price < 0.001) {
      return price.toFixed(8);
    }
    return price.toFixed(6);
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

  const formatChartLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeRange === "all") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
    } else if (timeRange === "7d") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else if (timeRange === "24h" || timeRange === "6h") {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const { devBuyPoints, devBuyAmounts } = useMemo(() => {
    if (chartData.length === 0) {
      return { devBuyPoints: [], devBuyAmounts: {} as Record<number, { total: number; count: number }> };
    }
    
    const result: (number | null)[] = new Array(chartData.length).fill(null);
    const amounts: Record<number, { total: number; count: number }> = {};
    
    const getToleranceMs = () => {
      switch (timeRange) {
        case "live":
        case "5m":
          return 60 * 1000;
        case "1h":
          return 5 * 60 * 1000;
        case "6h":
          return 30 * 60 * 1000;
        case "24h":
          return 2 * 60 * 60 * 1000;
        case "7d":
          return 12 * 60 * 60 * 1000;
        case "all":
          return 24 * 60 * 60 * 1000; // 24 hour tolerance for all time view
        default:
          return 60 * 60 * 1000;
      }
    };
    
    const toleranceMs = getToleranceMs();
    
    devBuys.forEach((buy) => {
      let closestIndex = -1;
      let closestDiff = Infinity;
      
      chartData.forEach((p, index) => {
        const diff = Math.abs(buy.timestamp - p.timestamp);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = index;
        }
      });
      
      if (closestIndex !== -1 && closestDiff < toleranceMs) {
        result[closestIndex] = chartData[closestIndex].price;
        if (amounts[closestIndex]) {
          amounts[closestIndex].total += buy.amount;
          amounts[closestIndex].count += 1;
        } else {
          amounts[closestIndex] = { total: buy.amount, count: 1 };
        }
      }
    });
    
    return { devBuyPoints: result, devBuyAmounts: amounts };
  }, [chartData, devBuys, timeRange]);

  // Calculate whale buy marker points from chart markers (aggregate multiple at same point)
  const { whaleBuyPoints, whaleBuyAmounts } = useMemo(() => {
    if (chartData.length === 0 || chartMarkers.length === 0) {
      return { whaleBuyPoints: [], whaleBuyAmounts: {} as Record<number, { total: number; count: number; totalPercent: number }> };
    }
    
    const result: (number | null)[] = new Array(chartData.length).fill(null);
    const amounts: Record<number, { total: number; count: number; totalPercent: number }> = {};
    
    const getToleranceMs = () => {
      switch (timeRange) {
        case "live":
        case "5m":
          return 60 * 1000;
        case "1h":
          return 5 * 60 * 1000;
        case "6h":
          return 30 * 60 * 1000;
        case "24h":
          return 2 * 60 * 60 * 1000;
        case "7d":
          return 12 * 60 * 60 * 1000;
        case "all":
          return 24 * 60 * 60 * 1000;
        default:
          return 60 * 60 * 1000;
      }
    };
    
    const toleranceMs = getToleranceMs();
    const whaleMarkers = chartMarkers.filter(m => m.type === "whale");
    
    whaleMarkers.forEach((marker) => {
      let closestIndex = -1;
      let closestDiff = Infinity;
      
      chartData.forEach((p, index) => {
        const diff = Math.abs(marker.timestamp - p.timestamp);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = index;
        }
      });
      
      if (closestIndex !== -1 && closestDiff < toleranceMs) {
        result[closestIndex] = chartData[closestIndex].price;
        if (amounts[closestIndex]) {
          amounts[closestIndex].total += marker.amount;
          amounts[closestIndex].count += 1;
          amounts[closestIndex].totalPercent += marker.percentOfSupply || 0;
        } else {
          amounts[closestIndex] = {
            total: marker.amount,
            count: 1,
            totalPercent: marker.percentOfSupply || 0,
          };
        }
      }
    });
    
    return { whaleBuyPoints: result, whaleBuyAmounts: amounts };
  }, [chartData, chartMarkers, timeRange]);

  const priceChartData = useMemo(() => ({
    labels: chartData.map((p) => formatChartLabel(p.timestamp)),
    datasets: [
      {
        label: "Price",
        data: chartData.map((p) => p.price),
        borderColor: "hsl(142 72% 45%)",
        backgroundColor: "hsl(142 72% 45% / 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: "Dev Buys",
        data: devBuyPoints,
        borderColor: "hsl(142 76% 36%)",
        backgroundColor: "hsl(142 72% 45%)",
        pointRadius: devBuyPoints.map((p) => (p !== null ? 8 : 0)),
        pointHoverRadius: 12,
        pointBorderWidth: 2,
        pointBorderColor: "hsl(142 76% 26%)",
        pointStyle: "triangle",
        showLine: false,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: "hsl(142 72% 55%)",
        pointHoverBorderColor: "hsl(120 5% 90%)",
      },
      {
        label: "Whale Buys",
        data: whaleBuyPoints,
        borderColor: "hsl(210 80% 50%)",
        backgroundColor: "hsl(210 80% 60%)",
        pointRadius: whaleBuyPoints.map((p) => (p !== null ? 10 : 0)),
        pointHoverRadius: 14,
        pointBorderWidth: 2,
        pointBorderColor: "hsl(210 80% 30%)",
        pointStyle: "rectRot",
        showLine: false,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: "hsl(210 80% 70%)",
        pointHoverBorderColor: "hsl(120 5% 90%)",
      },
    ],
  }), [chartData, devBuyPoints, whaleBuyPoints, timeRange]);

  const priceChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    plugins: {
      legend: {
        display: true, // Always show legend for Dev Buys and Whale Buys reference
        position: "top" as const,
        labels: {
          color: "hsl(120 3% 55%)",
          font: { family: "JetBrains Mono, monospace", size: 10 },
          usePointStyle: true,
          filter: (legendItem: any, chartData: any) => {
            // Always show Dev Buys and Whale Buys legends for reference
            const label = legendItem.text;
            if (label === "Whale Buys" || label === "Dev Buys") {
              return true; // Always show these legend items
            }
            // For other items, only show if they have data
            const datasetIndex = legendItem.datasetIndex;
            const dataset = chartData.datasets[datasetIndex];
            return dataset.data.some((d: any) => d !== null);
          },
        },
      },
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
        callbacks: {
          label: function (context: any) {
            const label = context.dataset.label || "";
            if (label === "Dev Buys") {
              const devData = devBuyAmounts[context.dataIndex];
              if (devData !== undefined) {
                const formattedAmount = devData.total >= 1000000
                  ? `${(devData.total / 1000000).toFixed(2)}M`
                  : devData.total >= 1000
                  ? `${(devData.total / 1000).toFixed(1)}K`
                  : devData.total.toLocaleString();
                const countStr = devData.count > 1 ? ` (${devData.count} buys)` : "";
                return `DEV BUY: ${formattedAmount} $NORMIE${countStr}`;
              }
              return "";
            }
            if (label === "Whale Buys") {
              const whaleData = whaleBuyAmounts[context.dataIndex];
              if (whaleData !== undefined) {
                const formattedAmount = whaleData.total >= 1000000
                  ? `${(whaleData.total / 1000000).toFixed(2)}M`
                  : whaleData.total >= 1000
                  ? `${(whaleData.total / 1000).toFixed(1)}K`
                  : whaleData.total.toLocaleString();
                const countStr = whaleData.count > 1 ? ` (${whaleData.count} buys)` : "";
                return `WHALE BUY: ${formattedAmount} $NORMIE (${whaleData.totalPercent.toFixed(1)}% of supply)${countStr}`;
              }
              return "";
            }
            return `${label}: ${formatPrice(context.raw)}`;
          },
        },
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
    hover: {
      mode: "nearest" as const,
      intersect: false,
    },
  }), [devBuys.length, devBuyAmounts, whaleBuyPoints, whaleBuyAmounts]);

  const totalRemoved = metrics
    ? metrics.burnedTokens + metrics.lockedTokens
    : 0;
  const strangleholdProgress = metrics
    ? (totalRemoved / metrics.totalSupply) * 100
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
            value={metrics ? `$${formatPrice(metrics.price)}` : "$0.00"}
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
          <a
            href="https://app.streamflow.finance/project-dashboard/solana/mainnet/FrSFwE2BxWADEyUWFXDMAeomzuB4r83ZvzdG9sevpump"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            data-testid="link-locked-streamflow"
          >
            <StatCard
              title="Locked"
              value={metrics ? formatNumber(metrics.lockedTokens) : "0"}
              icon={<Lock className="h-5 w-5" />}
              color="text-chart-3"
              isLoading={isLoading}
              subtitle="View contract on Streamflow"
            />
          </a>
          <StatCard
            title="Circulating"
            value={metrics ? formatNumber(metrics.circulatingSupply) : "0"}
            icon={<Activity className="h-5 w-5" />}
            isLoading={isLoading}
          />
        </div>

        {isAuthenticated && isFounder && (
          <div className="mb-8">
            <FounderWalletCards userWalletAddress={user?.walletAddress} />
          </div>
        )}

        <Card className="p-4 lg:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                Supply Stranglehold
              </h3>
              <p className="text-lg font-mono font-bold">
                {strangleholdProgress.toFixed(1)}% Removed
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-mono text-destructive text-xs">
                <Flame className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{metrics ? formatNumber(metrics.burnedTokens) : "0"} BURNED</span>
              </Badge>
              <Badge variant="outline" className="font-mono text-chart-3 text-xs">
                <Lock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{metrics ? formatNumber(metrics.lockedTokens) : "0"} LOCKED</span>
              </Badge>
            </div>
          </div>
          <Progress value={strangleholdProgress} className="h-3" />
          <div className="flex justify-between mt-2 text-xs font-mono text-muted-foreground">
            <span>0%</span>
            <span>{metrics ? formatNumber(totalRemoved) : "0"} removed total</span>
            <span>100%</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                Price Chart
              </h3>
              <div className="flex items-center gap-1 flex-wrap">
                {TIME_RANGES.map((range) => (
                  <Button
                    key={range.id}
                    variant={timeRange === range.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimeRange(range.id)}
                    className="font-mono text-xs px-2"
                    data-testid={`button-range-${range.id}`}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="h-64 lg:h-80">
              {isLoadingChart ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : chartData.length > 0 ? (
                <div 
                  className="h-full w-full" 
                  style={{ touchAction: "none" }}
                  data-testid="chart-touch-container"
                >
                  <Line data={priceChartData} options={priceChartOptions} />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Waiting for price data...
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-500" />
                <p className="font-mono">
                  Normie Nation data may vary 1-5% from PumpFun due to refresh intervals. For real-time precision, check PumpFun directly.
                </p>
              </div>
              <a
                href="https://pump.fun/coin/FrSFwE2BxWADEyUWFXDMAeomzuB4r83ZvzdG9sevpump"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
                data-testid="link-pumpfun"
              >
                <Button variant="outline" size="sm" className="font-mono gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View on PumpFun
                </Button>
              </a>
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
