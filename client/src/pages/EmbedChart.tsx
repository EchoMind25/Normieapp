import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { PricePoint } from "@shared/schema";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TokenMetrics {
  price: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
  totalSupply: number;
  circulatingSupply: number;
  burnedTokens: number;
  lockedTokens: number;
  holders: number;
  lastUpdated: string;
}

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toLocaleString();
}

function formatUSD(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toLocaleString()}`;
}

function formatChartLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

type TimeRange = "live" | "5m" | "1h" | "6h" | "24h" | "7d" | "all";

interface ChartMarker {
  type: "dev" | "whale";
  signature: string;
  timestamp: number;
  amount: number;
  price: number;
  walletAddress?: string;
  percentOfSupply?: number;
}

type ViewMode = "chart" | "diamond" | "whales" | "jeets";

interface EmbedConfig {
  theme: "dark" | "light";
  showControls: boolean;
  defaultRange: TimeRange;
  height: string;
  accentColor: string;
  showBranding: boolean;
  token?: string;
  view: ViewMode;
}

interface DiamondHandsEntry {
  rank: number;
  walletAddress: string;
  userId: string | null;
  username: string | null;
  currentBalance: number;
  holdDurationSeconds: number;
  firstBuyAt: string | null;
  solscanUrl: string;
}

interface WhaleEntry {
  rank: number;
  walletAddress: string;
  userId: string | null;
  username: string | null;
  currentBalance: number;
  holdDurationSeconds: number;
  firstBuyAt: string | null;
  solscanUrl: string;
}

interface JeetEntry {
  rank: number;
  walletAddress: string;
  totalSold: number;
  sellCount: number;
  solscanUrl: string;
}

function getQueryParams(): EmbedConfig {
  const params = new URLSearchParams(window.location.search);
  return {
    theme: (params.get("theme") as "dark" | "light") || "dark",
    showControls: params.get("controls") !== "false",
    defaultRange: (params.get("range") as TimeRange) || "24h",
    height: params.get("height") || "400px",
    accentColor: params.get("color") || "142 72% 45%",
    showBranding: params.get("branding") !== "false",
    token: params.get("token") || undefined,
    view: (params.get("view") as ViewMode) || "chart",
  };
}

export default function EmbedChart() {
  const config = useMemo(() => getQueryParams(), []);
  const [timeRange, setTimeRange] = useState<TimeRange>(config.defaultRange);
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const lastFetchRef = useRef<number>(0);
  const [chartMarkers, setChartMarkers] = useState<ChartMarker[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<(DiamondHandsEntry | WhaleEntry | JeetEntry)[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Fetch token metrics (holders, burned, locked, etc.)
  const fetchMetrics = useCallback(async () => {
    try {
      const headers: HeadersInit = {};
      if (config.token) {
        headers["X-Embed-Token"] = config.token;
      }
      const response = await fetch("/api/embed/metrics", { headers });
      if (response.ok) {
        const data: TokenMetrics = await response.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    }
  }, [config.token]);

  const fetchChartData = useCallback(async (range: TimeRange, forceRefresh = false) => {
    const now = Date.now();
    // Only throttle auto-refresh, not manual range changes
    if (!forceRefresh && now - lastFetchRef.current < 5000) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const headers: HeadersInit = {};
      if (config.token) {
        headers["X-Embed-Token"] = config.token;
      }

      const response = await fetch(`/api/embed/price-history?range=${range}`, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid or missing embed token");
        }
        throw new Error("Failed to fetch chart data");
      }
      
      const data: PricePoint[] = await response.json();
      const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
      setChartData(sorted);
      lastFetchRef.current = now;

      if (sorted.length > 0) {
        const latestPrice = sorted[sorted.length - 1].price;
        const firstPrice = sorted[0].price;
        setCurrentPrice(latestPrice);
        setPriceChange(((latestPrice - firstPrice) / firstPrice) * 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chart");
    } finally {
      setIsLoading(false);
    }
  }, [config.token]);

  useEffect(() => {
    // Only fetch chart data when in chart view mode
    if (config.view !== "chart") return;
    
    // Force refresh when time range changes (user clicked a button)
    fetchChartData(timeRange, true);
    
    const interval = setInterval(() => {
      fetchChartData(timeRange, false);
    }, timeRange === "live" ? 10000 : 60000);
    
    return () => clearInterval(interval);
  }, [timeRange, fetchChartData, config.view]);

  // Fetch metrics on mount and refresh periodically (only for chart view)
  useEffect(() => {
    if (config.view !== "chart") return;
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics, config.view]);

  // Fetch leaderboard data when in leaderboard view mode
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  
  useEffect(() => {
    if (config.view === "chart") return;
    
    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true);
      setLeaderboardError(null); // Clear error before fetch
      try {
        const headers: HeadersInit = {};
        if (config.token) {
          headers["X-Embed-Token"] = config.token;
        }
        const endpoint = `/api/embed/leaderboard/${config.view}`;
        const response = await fetch(endpoint, { headers });
        if (response.ok) {
          const data = await response.json();
          setLeaderboardData(data);
          setLeaderboardError(null); // Clear error on success
        } else {
          setLeaderboardError("Failed to fetch leaderboard");
        }
      } catch (err) {
        setLeaderboardError(err instanceof Error ? err.message : "Failed to load leaderboard");
      } finally {
        setLeaderboardLoading(false);
        setIsLoading(false);
      }
    };
    
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [config.view, config.token]);

  // Fetch chart markers (whale buys + dev buys) when time range changes (only for chart view)
  useEffect(() => {
    if (config.view !== "chart") return;
    
    const fetchMarkers = async () => {
      try {
        const headers: HeadersInit = {};
        if (config.token) {
          headers["X-Embed-Token"] = config.token;
        }
        const apiRange = timeRange === "live" ? "24h" : timeRange;
        const response = await fetch(`/api/embed/chart-markers?range=${apiRange}`, { headers });
        if (response.ok) {
          const markers: ChartMarker[] = await response.json();
          setChartMarkers(markers);
        }
      } catch (error) {
        console.error("[EmbedChart] Error fetching markers:", error);
      }
    };
    fetchMarkers();
  }, [timeRange, config.token, config.view]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", config.theme === "dark");
    document.body.style.background = config.theme === "dark" ? "hsl(120 6% 8%)" : "#ffffff";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
  }, [config.theme]);

  // Calculate dev buy and whale buy marker points (aggregate multiple markers per point)
  const { devBuyPoints, whaleBuyPoints, devBuyAmounts, whaleBuyAmounts } = useMemo(() => {
    if (chartData.length === 0 || chartMarkers.length === 0) {
      return {
        devBuyPoints: [] as (number | null)[],
        whaleBuyPoints: [] as (number | null)[],
        devBuyAmounts: {} as Record<number, { total: number; count: number }>,
        whaleBuyAmounts: {} as Record<number, { total: number; count: number; totalPercent: number }>,
      };
    }
    
    const devPoints: (number | null)[] = new Array(chartData.length).fill(null);
    const whalePoints: (number | null)[] = new Array(chartData.length).fill(null);
    const devAmounts: Record<number, { total: number; count: number }> = {};
    const whaleAmounts: Record<number, { total: number; count: number; totalPercent: number }> = {};
    
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
    
    chartMarkers.forEach((marker) => {
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
        if (marker.type === "dev") {
          devPoints[closestIndex] = chartData[closestIndex].price;
          if (devAmounts[closestIndex]) {
            devAmounts[closestIndex].total += marker.amount;
            devAmounts[closestIndex].count += 1;
          } else {
            devAmounts[closestIndex] = { total: marker.amount, count: 1 };
          }
        } else if (marker.type === "whale") {
          whalePoints[closestIndex] = chartData[closestIndex].price;
          if (whaleAmounts[closestIndex]) {
            whaleAmounts[closestIndex].total += marker.amount;
            whaleAmounts[closestIndex].count += 1;
            whaleAmounts[closestIndex].totalPercent += marker.percentOfSupply || 0;
          } else {
            whaleAmounts[closestIndex] = {
              total: marker.amount,
              count: 1,
              totalPercent: marker.percentOfSupply || 0,
            };
          }
        }
      }
    });
    
    return { devBuyPoints: devPoints, whaleBuyPoints: whalePoints, devBuyAmounts: devAmounts, whaleBuyAmounts: whaleAmounts };
  }, [chartData, chartMarkers, timeRange]);

  const priceChartData = useMemo(() => ({
    labels: chartData.map((p) => formatChartLabel(p.timestamp)),
    datasets: [
      {
        label: "Price",
        data: chartData.map((p) => p.price),
        borderColor: `hsl(${config.accentColor})`,
        backgroundColor: `hsl(${config.accentColor} / 0.1)`,
        borderWidth: 2,
        fill: true,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: "Dev Buys",
        data: devBuyPoints,
        borderColor: `hsl(${config.accentColor})`,
        backgroundColor: `hsl(${config.accentColor})`,
        pointRadius: devBuyPoints.map((p) => (p !== null ? 8 : 0)),
        pointHoverRadius: 12,
        pointBorderWidth: 2,
        pointBorderColor: "hsl(142 76% 26%)",
        pointStyle: "triangle",
        showLine: false,
        pointHoverBorderWidth: 3,
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
      },
    ],
  }), [chartData, config.accentColor, devBuyPoints, whaleBuyPoints]);

  const priceChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: {
        display: true, // Always show legend for Dev Buys and Whale Buys reference
        position: "top" as const,
        labels: {
          color: config.theme === "dark" ? "hsl(120 3% 55%)" : "#666666",
          font: { size: 10 },
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
        backgroundColor: config.theme === "dark" ? "hsl(120 6% 12%)" : "#ffffff",
        titleColor: config.theme === "dark" ? "hsl(120 5% 90%)" : "#1a1a1a",
        bodyColor: config.theme === "dark" ? "hsl(120 5% 90%)" : "#1a1a1a",
        borderColor: config.theme === "dark" ? "hsl(120 5% 18%)" : "#e5e5e5",
        borderWidth: 1,
        titleFont: { family: "system-ui, sans-serif" },
        bodyFont: { family: "system-ui, sans-serif" },
        callbacks: {
          label: (context: any) => {
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
                return `WHALE BUY: ${formattedAmount} (${whaleData.totalPercent.toFixed(1)}%)${countStr}`;
              }
              return "";
            }
            return `Price: ${formatPrice(context.raw)}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: { 
          color: config.theme === "dark" ? "hsl(120 5% 18% / 0.5)" : "#f0f0f0",
          drawBorder: false 
        },
        ticks: {
          color: config.theme === "dark" ? "hsl(120 3% 55%)" : "#666666",
          font: { size: 10 },
          maxTicksLimit: 6,
        },
      },
      y: {
        display: true,
        grid: { 
          color: config.theme === "dark" ? "hsl(120 5% 18% / 0.5)" : "#f0f0f0",
          drawBorder: false 
        },
        ticks: {
          color: config.theme === "dark" ? "hsl(120 3% 55%)" : "#666666",
          font: { size: 10 },
          callback: (value: any) => formatPrice(value),
        },
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  }), [config.theme, devBuyPoints, whaleBuyPoints, devBuyAmounts, whaleBuyAmounts]);

  const timeRanges: TimeRange[] = ["live", "5m", "1h", "6h", "24h", "7d", "all"];

  const containerStyle: React.CSSProperties = {
    height: config.height,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    fontFamily: "system-ui, -apple-system, sans-serif",
    background: config.theme === "dark" ? "hsl(120 6% 8%)" : "#ffffff",
    color: config.theme === "dark" ? "hsl(120 5% 90%)" : "#1a1a1a",
    boxSizing: "border-box",
    padding: "12px",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px",
  };

  const priceStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
  };

  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: isActive ? 600 : 400,
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    background: isActive 
      ? `hsl(${config.accentColor})` 
      : config.theme === "dark" ? "hsl(120 5% 15%)" : "#f0f0f0",
    color: isActive 
      ? "#ffffff" 
      : config.theme === "dark" ? "hsl(120 5% 70%)" : "#666666",
    transition: "all 0.15s ease",
  });

  // Only show chart error for chart view
  if (error && config.view === "chart") {
    return (
      <div style={{ ...containerStyle, justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "14px", marginBottom: "8px", color: "#ef4444" }}>
            {error}
          </div>
          <button
            onClick={() => fetchChartData(timeRange)}
            style={{
              ...buttonStyle(true),
              padding: "8px 16px",
              fontSize: "13px",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getLeaderboardTitle = () => {
    switch (config.view) {
      case "diamond": return "Diamond Hands";
      case "whales": return "Top Holders";
      case "jeets": return "Paper Hands";
      default: return "Leaderboard";
    }
  };

  const formatDuration = (seconds: number): string => {
    // Show minimum 1 hour if no data available
    const effectiveSeconds = (!seconds || seconds <= 0) ? 3600 : Math.max(seconds, 3600);
    const days = Math.floor(effectiveSeconds / 86400);
    const hours = Math.floor((effectiveSeconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    const minutes = Math.floor((effectiveSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const truncateAddress = (addr: string): string => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  // Leaderboard view rendering
  if (config.view !== "chart") {
    // Show leaderboard-specific error
    if (leaderboardError && leaderboardData.length === 0) {
      return (
        <div style={{ ...containerStyle, justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", marginBottom: "8px", color: "#ef4444" }}>
              {leaderboardError}
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div style={containerStyle} data-testid="embed-leaderboard-container">
        <div style={{ marginBottom: "12px" }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: "16px", 
            fontWeight: 600,
            color: `hsl(${config.accentColor})`,
          }}>
            {getLeaderboardTitle()}
          </h2>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {leaderboardLoading && leaderboardData.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  border: `2px solid hsl(${config.accentColor} / 0.3)`,
                  borderTopColor: `hsl(${config.accentColor})`,
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ 
                  borderBottom: `1px solid ${config.theme === "dark" ? "hsl(120 5% 20%)" : "#e5e5e5"}`,
                }}>
                  <th style={{ textAlign: "left", padding: "8px 4px", fontWeight: 500, opacity: 0.7 }}>#</th>
                  <th style={{ textAlign: "left", padding: "8px 4px", fontWeight: 500, opacity: 0.7 }}>Wallet</th>
                  {config.view === "jeets" ? (
                    <>
                      <th style={{ textAlign: "right", padding: "8px 4px", fontWeight: 500, opacity: 0.7 }}>Total Sold</th>
                      <th style={{ textAlign: "right", padding: "8px 4px", fontWeight: 500, opacity: 0.7 }}>Sells</th>
                    </>
                  ) : (
                    <>
                      <th style={{ textAlign: "right", padding: "8px 4px", fontWeight: 500, opacity: 0.7 }}>Balance</th>
                      <th style={{ textAlign: "right", padding: "8px 4px", fontWeight: 500, opacity: 0.7 }}>Holding</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((entry, index) => (
                  <tr 
                    key={index}
                    style={{ 
                      borderBottom: `1px solid ${config.theme === "dark" ? "hsl(120 5% 15%)" : "#f0f0f0"}`,
                    }}
                  >
                    <td style={{ padding: "8px 4px", fontWeight: 500 }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: "8px 4px" }}>
                      <a 
                        href={(entry as any).solscanUrl || `https://solscan.io/account/${entry.walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          color: `hsl(${config.accentColor})`, 
                          textDecoration: "none",
                          fontFamily: "monospace",
                        }}
                        data-testid={`link-wallet-${index}`}
                      >
                        {(entry as any).username || truncateAddress(entry.walletAddress)}
                      </a>
                    </td>
                    {config.view === "jeets" ? (
                      <>
                        <td style={{ textAlign: "right", padding: "8px 4px", color: "#ef4444" }}>
                          {formatNumber((entry as JeetEntry).totalSold)}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px 4px", opacity: 0.7 }}>
                          {(entry as JeetEntry).sellCount}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ textAlign: "right", padding: "8px 4px" }}>
                          {formatNumber((entry as DiamondHandsEntry | WhaleEntry).currentBalance)}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px 4px", opacity: 0.7 }}>
                          {formatDuration((entry as DiamondHandsEntry | WhaleEntry).holdDurationSeconds)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ 
          marginTop: "12px", 
          padding: "8px", 
          fontSize: "9px", 
          opacity: 0.5,
          borderTop: `1px solid ${config.theme === "dark" ? "hsl(120 5% 20%)" : "#e5e5e5"}`,
          lineHeight: 1.4,
        }}>
          Data sourced from publicly available on-chain records. Some statistics may be unavailable if not yet obtained.
        </div>

        {config.showBranding && (
          <div style={{ marginTop: "4px", textAlign: "right", fontSize: "10px", opacity: 0.6 }}>
            <a
              href="https://normie.observer"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Powered by normie.observer
            </a>
          </div>
        )}

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          * { box-sizing: border-box; }
          tr:hover { background: ${config.theme === "dark" ? "hsl(120 5% 12%)" : "#fafafa"}; }
        `}</style>
      </div>
    );
  }

  // Chart view rendering (original)
  return (
    <div style={containerStyle} data-testid="embed-chart-container">
      {config.showControls && (
        <div style={headerStyle}>
          <div style={priceStyle}>
            {currentPrice !== null && (
              <>
                <span style={{ fontSize: "18px", fontWeight: 600 }} data-testid="text-current-price">
                  {formatPrice(currentPrice)}
                </span>
                {priceChange !== null && (
                  <span
                    style={{
                      fontSize: "13px",
                      color: priceChange >= 0 ? `hsl(${config.accentColor})` : "#ef4444",
                    }}
                    data-testid="text-price-change"
                  >
                    {priceChange >= 0 ? "+" : ""}
                    {priceChange.toFixed(2)}%
                  </span>
                )}
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={buttonStyle(timeRange === range)}
                data-testid={`button-range-${range}`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {isLoading && chartData.length === 0 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: config.theme === "dark" ? "hsl(120 6% 10%)" : "#fafafa",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                border: `2px solid hsl(${config.accentColor} / 0.3)`,
                borderTopColor: `hsl(${config.accentColor})`,
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        ) : (
          <Line data={priceChartData} options={priceChartOptions} />
        )}
      </div>

      {/* Token Stats Bar */}
      {metrics && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
            gap: "8px",
            marginTop: "12px",
            padding: "10px",
            background: config.theme === "dark" ? "hsl(120 5% 12%)" : "#f5f5f5",
            borderRadius: "6px",
          }}
          data-testid="stats-bar"
        >
          <StatItem
            label="Market Cap"
            value={formatUSD(metrics.marketCap)}
            theme={config.theme}
            testId="stat-market-cap"
          />
          <StatItem
            label="Volume 24h"
            value={formatUSD(metrics.volume24h)}
            theme={config.theme}
            testId="stat-volume"
          />
          <StatItem
            label="Liquidity"
            value={formatUSD(metrics.liquidity)}
            theme={config.theme}
            testId="stat-liquidity"
          />
          <StatItem
            label="Holders"
            value={metrics.holders.toLocaleString()}
            theme={config.theme}
            testId="stat-holders"
          />
          <StatItem
            label="Burned"
            value={formatNumber(metrics.burnedTokens)}
            theme={config.theme}
            testId="stat-burned"
          />
          <StatItem
            label="Locked"
            value={formatNumber(metrics.lockedTokens)}
            theme={config.theme}
            testId="stat-locked"
          />
        </div>
      )}

      {config.showBranding && (
        <div
          style={{
            marginTop: "8px",
            textAlign: "right",
            fontSize: "10px",
            opacity: 0.6,
          }}
          data-testid="text-branding"
        >
          <a
            href="https://normie.observer"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "inherit",
              textDecoration: "none",
            }}
            data-testid="link-normie-observer"
          >
            Powered by normie.observer
          </a>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}

// Stat item component for the stats bar
function StatItem({
  label,
  value,
  theme,
  testId,
}: {
  label: string;
  value: string;
  theme: "dark" | "light";
  testId: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
      data-testid={testId}
    >
      <span
        style={{
          fontSize: "9px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: theme === "dark" ? "hsl(120 3% 55%)" : "#888888",
          marginBottom: "2px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: theme === "dark" ? "hsl(120 5% 90%)" : "#1a1a1a",
        }}
      >
        {value}
      </span>
    </div>
  );
}
