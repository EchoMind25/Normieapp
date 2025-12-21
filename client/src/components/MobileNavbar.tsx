import { Link } from "wouter";
import { Image, Users, Home, MessageSquare } from "lucide-react";

interface MobileNavbarProps {
  onNavigate: (sectionId: string) => void;
}

export function MobileNavbar({ onNavigate }: MobileNavbarProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        <button
          onClick={() => onNavigate("dashboard")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="mobile-nav-home"
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <Link href="/meme-generator">
          <div
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="mobile-nav-memes"
          >
            <Image className="h-5 w-5" />
            <span className="text-[10px] font-medium">Memes</span>
          </div>
        </Link>
        <button
          onClick={() => onNavigate("community")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="mobile-nav-community"
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-medium">Community</span>
        </button>
        <Link href="/chat">
          <div
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="mobile-nav-chat"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[10px] font-medium">Chat</span>
          </div>
        </Link>
      </div>
    </nav>
  );
}
