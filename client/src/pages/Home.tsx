import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { MemeGenerator } from "@/components/MemeGenerator";
import { MerchShop } from "@/components/MerchShop";
import { CommunityHub } from "@/components/CommunityHub";
import { Footer } from "@/components/Footer";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTheme } from "@/hooks/useTheme";

export default function Home() {
  const { metrics, priceHistory, isConnected, isLoading } = useWebSocket();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        metrics={metrics}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />
      
      <main>
        <Dashboard
          metrics={metrics}
          priceHistory={priceHistory}
          isLoading={isLoading}
          isConnected={isConnected}
        />
        
        <MemeGenerator />
        
        <MerchShop />
        
        <CommunityHub />
      </main>
      
      <Footer />
    </div>
  );
}
