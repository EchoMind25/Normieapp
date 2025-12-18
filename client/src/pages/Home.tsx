import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { MemeGenerator } from "@/components/MemeGenerator";
import { CommunityHub } from "@/components/CommunityHub";
import { ArtGallery } from "@/components/ArtGallery";
import { LiveChat } from "@/components/LiveChat";
import { Footer } from "@/components/Footer";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTheme } from "@/hooks/useTheme";

export default function Home() {
  const { metrics, priceHistory, devBuys, isConnected, isLoading } = useWebSocket();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="ambient-background" aria-hidden="true">
        <div className="ambient-glow-orb ambient-glow-orb-1" />
        <div className="ambient-glow-orb ambient-glow-orb-2" />
      </div>
      <div className="scanline-overlay" aria-hidden="true" />
      
      <Header
        metrics={metrics}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />
      
      <main>
        <Dashboard
          metrics={metrics}
          priceHistory={priceHistory}
          devBuys={devBuys}
          isLoading={isLoading}
          isConnected={isConnected}
        />
        
        <MemeGenerator />
        
        <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8 lg:py-12">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <ArtGallery />
            <LiveChat />
          </div>
        </section>
        
        <CommunityHub />
      </main>
      
      <Footer />
    </div>
  );
}
