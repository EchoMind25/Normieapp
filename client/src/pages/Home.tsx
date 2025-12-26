import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { CommunityHub } from "@/components/CommunityHub";
import { ArtGallery } from "@/components/ArtGallery";
import { LiveChat } from "@/components/LiveChat";
import { BiggestJeetLeaderboard } from "@/components/BiggestJeetLeaderboard";
import { HolderLeaderboards } from "@/components/HolderLeaderboards";
import { Footer } from "@/components/Footer";
import { TransactionBubbles } from "@/components/TransactionBubbles";
import { FloatingMascot } from "@/components/FloatingMascot";
import { ConfettiCelebration } from "@/components/ConfettiCelebration";
import { EasterEggs } from "@/components/EasterEggs";
import { useSoundEffects } from "@/components/SoundEffects";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTheme } from "@/hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MobileNavbar } from "@/components/MobileNavbar";
import { Image, MessageSquare, ArrowRight, Palette } from "lucide-react";

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

  // Scroll to top is now handled globally in App.tsx useScrollReset hook

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
          
          <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
              <Link href="/meme-generator">
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 font-mono text-lg">
                      <Image className="w-5 h-5 text-primary" />
                      Meme Generator
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create epic memes with stickers, text, and backgrounds. Share with the community!
                    </p>
                    <Button variant="outline" className="gap-2 w-full" data-testid="button-open-memes">
                      Open Generator
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/art-gallery">
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 font-mono text-lg">
                      <Palette className="w-5 h-5 text-primary" />
                      Art Gallery
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Browse community artwork and submit your own creations for the gallery.
                    </p>
                    <Button variant="outline" className="gap-2 w-full" data-testid="button-open-gallery">
                      View Gallery
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/chat">
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 font-mono text-lg">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Community Chat
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Join the conversation with fellow Normies in our full-screen chat experience.
                    </p>
                    <Button variant="outline" className="gap-2 w-full" data-testid="button-open-chat">
                      Open Chat
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>
          
          <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8 lg:py-12">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <ArtGallery />
              <LiveChat />
            </div>
          </section>
          
          <section id="leaderboards" className="hidden md:block max-w-7xl mx-auto px-4 py-6 sm:py-8">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <BiggestJeetLeaderboard />
              <HolderLeaderboards />
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
