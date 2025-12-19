import { Link } from "wouter";
import { BarChart3, Image, Users, Home, ShoppingBag } from "lucide-react";

interface MobileNavbarProps {
  onNavigate: (sectionId: string) => void;
}

export function MobileNavbar({ onNavigate }: MobileNavbarProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        <button
          onClick={() => onNavigate("top")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="mobile-nav-home"
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button
          onClick={() => onNavigate("dashboard")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="mobile-nav-dashboard"
        >
          <BarChart3 className="h-5 w-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        <Link href="/marketplace">
          <div
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="mobile-nav-marketplace"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="text-[10px] font-medium">NFTs</span>
          </div>
        </Link>
        <button
          onClick={() => onNavigate("meme-generator")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="mobile-nav-memes"
        >
          <Image className="h-5 w-5" />
          <span className="text-[10px] font-medium">Memes</span>
        </button>
        <button
          onClick={() => onNavigate("community")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="mobile-nav-community"
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-medium">Community</span>
        </button>
      </div>
    </nav>
  );
}
