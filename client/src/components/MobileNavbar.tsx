import { Link, useLocation } from "wouter";
import { Image, Users, Home, MessageSquare, Trophy } from "lucide-react";

interface MobileNavbarProps {
  onNavigate: (sectionId: string) => void;
}

export function MobileNavbar({ onNavigate }: MobileNavbarProps) {
  const [location] = useLocation();
  const isHome = location === "/" || location === "";

  const navItemClass = "flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-foreground transition-colors min-w-0 px-1";
  const activeClass = "text-foreground";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-stretch h-16">
        <button
          onClick={() => onNavigate("dashboard")}
          className={`flex-1 ${navItemClass} ${isHome ? activeClass : ""}`}
          data-testid="mobile-nav-home"
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        
        <Link href="/leaderboards" className={`flex-1 ${navItemClass} ${location === "/leaderboards" ? activeClass : ""}`}>
          <Trophy className="h-5 w-5" />
          <span className="text-[10px] font-medium">Ranks</span>
        </Link>
        
        <Link href="/meme-generator" className={`flex-1 ${navItemClass} ${location === "/meme-generator" ? activeClass : ""}`} data-testid="mobile-nav-memes">
          <Image className="h-5 w-5" />
          <span className="text-[10px] font-medium">Memes</span>
        </Link>
        
        <button
          onClick={() => onNavigate("community")}
          className={`flex-1 ${navItemClass}`}
          data-testid="mobile-nav-community"
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-medium">Community</span>
        </button>
        
        <Link href="/chat" className={`flex-1 ${navItemClass} ${location === "/chat" ? activeClass : ""}`} data-testid="mobile-nav-chat">
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] font-medium">Chat</span>
        </Link>
      </div>
    </nav>
  );
}
