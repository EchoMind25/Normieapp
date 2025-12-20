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

type TimeRange = "live" | "5m" | "1h" | "6h" | "24h" | "7d";

interface EmbedConfig {
  theme: "dark" | "light";
  showControls: boolean;
  defaultRange: TimeRange;
  height: string;
  accentColor: string;
  showBranding: boolean;
  token?: string;
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
    // Force refresh when time range changes (user clicked a button)
    fetchChartData(timeRange, true);
    
    const interval = setInterval(() => {
      fetchChartData(timeRange, false);
    }, timeRange === "live" ? 10000 : 60000);
    
    return () => clearInterval(interval);
  }, [timeRange, fetchChartData]);

  // Fetch metrics on mount and refresh periodically
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", config.theme === "dark");
    document.body.style.background = config.theme === "dark" ? "hsl(120 6% 8%)" : "#ffffff";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
  }, [config.theme]);

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
    ],
  }), [chartData, config.accentColor]);

  const priceChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: { display: false },
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
          label: (context: any) => `Price: ${formatPrice(context.raw)}`,
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
  }), [config.theme]);

  const timeRanges: TimeRange[] = ["live", "5m", "1h", "6h", "24h", "7d"];

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

  if (error) {
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
