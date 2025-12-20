import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { CommunityHub } from "@/components/CommunityHub";
import { ArtGallery } from "@/components/ArtGallery";
import { LiveChat } from "@/components/LiveChat";
import { Footer } from "@/components/Footer";
import { TransactionBubbles } from "@/components/TransactionBubbles";
import { FloatingMascot } from "@/components/FloatingMascot";
import { ConfettiCelebration } from "@/components/ConfettiCelebration";
import { EasterEggs } from "@/components/EasterEggs";
import { useSoundEffects } from "@/components/SoundEffects";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileNavbar } from "@/components/MobileNavbar";

const MemeGenerator = lazy(() => import("@/components/MemeGenerator").then(m => ({ default: m.MemeGenerator })));

function MemeGeneratorLoader() {
  return (
    <Card className="p-6 m-4">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </Card>
  );
}

const PRICE_MILESTONES = [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1];

export default function Home() {
  const { metrics, priceHistory, devBuys, activity, isConnected, isLoading } = useWebSocket();
  const { isDark, toggleTheme } = useTheme();
  const { playSound } = useSoundEffects();
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiMessage, setConfettiMessage] = useState("");
  const [diamondHandsMode, setDiamondHandsMode] = useState(false);
  
  const prevPriceRef = useRef<number | null>(null);
  const passedMilestonesRef = useRef<Set<number>>(new Set());

  // Force scroll to top on mount to ensure Dashboard is visible first
  // Multiple attempts to override any browser/lazy-load scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Immediate scroll
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // After microtask to catch async renders
    queueMicrotask(() => {
      window.scrollTo(0, 0);
    });
    
    // After initial render cycle
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    
    // After lazy components load
    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 150);
    
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!metrics?.price) return;
    
    const currentPrice = metrics.price;
    const prevPrice = prevPriceRef.current;

    if (prevPrice !== null) {
      PRICE_MILESTONES.forEach((milestone) => {
        if (
          prevPrice < milestone &&
          currentPrice >= milestone &&
          !passedMilestonesRef.current.has(milestone)
        ) {
          passedMilestonesRef.current.add(milestone);
          setConfettiMessage(`$${milestone} REACHED!`);
          setShowConfetti(true);
          playSound("milestone");
        }
      });

      const changePercent = ((currentPrice - prevPrice) / prevPrice) * 100;
      if (changePercent > 10) {
        playSound("pump");
      } else if (changePercent < -10) {
        playSound("dump");
      }
    }

    prevPriceRef.current = currentPrice;
  }, [metrics?.price, playSound]);

  const handleKonamiCode = useCallback(() => {
    setDiamondHandsMode(true);
    playSound("milestone");
    setConfettiMessage("DIAMOND HANDS UNLOCKED");
    setShowConfetti(true);
  }, [playSound]);

  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
    setConfettiMessage("");
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    if (sectionId === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  return (
    <div className="min-h-screen text-foreground relative">
      <div className="monogram-backdrop" aria-hidden="true" />
      <div className="ambient-background" aria-hidden="true">
        <div className="ambient-glow-orb ambient-glow-orb-1" />
        <div className="ambient-glow-orb ambient-glow-orb-2" />
      </div>
      <div className="scanline-overlay" aria-hidden="true" />
      
      <TransactionBubbles />
      
      <ConfettiCelebration
        trigger={showConfetti}
        message={confettiMessage}
        onComplete={handleConfettiComplete}
      />
      
      <EasterEggs onKonamiCode={handleKonamiCode} />
      
      <FloatingMascot
        priceChange={metrics?.priceChange24h || 0}
        devBuys={devBuys}
        activity={activity}
      />
      
      <div className="relative z-10">
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
          
          <Suspense fallback={<MemeGeneratorLoader />}>
            <MemeGenerator />
          </Suspense>
          
          <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8 lg:py-12">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <ArtGallery />
              <LiveChat />
            </div>
          </section>
          
          <CommunityHub />
        </main>
        
        <Footer />
        
        {/* Spacer for mobile navbar */}
        <div className="h-16 md:hidden" />
      </div>
      
      <MobileNavbar onNavigate={scrollToSection} />
    </div>
  );
}
