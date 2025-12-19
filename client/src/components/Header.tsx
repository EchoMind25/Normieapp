import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Users, Flame, LogIn, LogOut, User, Shield, Settings, ShoppingBag, MessageCircle } from "lucide-react";
import { SoundToggle } from "@/components/SoundEffects";
import { NotificationBell } from "@/components/NotificationBell";
import { SiTelegram, SiX } from "react-icons/si";
import { NORMIE_TOKEN } from "@shared/schema";
import type { TokenMetrics } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "./AuthModal";

interface HeaderProps {
  metrics: TokenMetrics | null;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Header({ metrics, isDark, onToggleTheme }: HeaderProps) {
  const [, setLocation] = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const formatPrice = (price: number) => {
    if (price < 0.001) {
      return `$${price.toFixed(8)}`;
    }
    return `$${price.toFixed(6)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(0);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-8">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 hover-elevate rounded-md px-1">
            <img 
              src="https://res.cloudinary.com/dmt4dpsnw/image/upload/w_32,h_32,c_fill/v1765997164/Normie-Favicon_on9ov0.png" 
              alt="Normie" 
              className="h-8 w-8"
              data-testid="img-normie-icon"
            />
            <span className="font-mono text-lg font-bold tracking-tight text-foreground">
              {NORMIE_TOKEN.symbol}
            </span>
          </a>
          {metrics && (
            <Badge variant="outline" className="hidden sm:flex font-mono text-xs">
              {formatPrice(metrics.price)}
              <span className={`ml-1 ${metrics.priceChange24h >= 0 ? "text-chart-1" : "text-destructive"}`}>
                {metrics.priceChange24h >= 0 ? "+" : ""}{metrics.priceChange24h.toFixed(2)}%
              </span>
            </Badge>
          )}
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollToSection("dashboard")}
            data-testid="nav-dashboard"
          >
            Dashboard
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollToSection("meme-generator")}
            data-testid="nav-memes"
          >
            Memes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollToSection("community")}
            data-testid="nav-community"
          >
            Community
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="opacity-60 gap-1"
            data-testid="nav-nft-marketplace"
          >
            <ShoppingBag className="h-4 w-4" />
            NFTs
            <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">
              Soon
            </Badge>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="opacity-60 gap-1"
            data-testid="nav-private-chats"
          >
            <MessageCircle className="h-4 w-4" />
            DMs
            <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">
              Soon
            </Badge>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          {metrics && (
            <div className="hidden lg:flex items-center gap-3 mr-2">
              <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span data-testid="text-holders">{formatNumber(metrics.holders)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-mono text-destructive">
                <Flame className="h-3.5 w-3.5" />
                <span data-testid="text-burned">{formatNumber(metrics.burnedTokens)}</span>
              </div>
            </div>
          )}

          <a
            href={`https://t.me/${NORMIE_TOKEN.telegram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-telegram"
          >
            <Button variant="ghost" size="icon">
              <SiTelegram className="h-4 w-4" />
            </Button>
          </a>
          <a
            href={`https://x.com/${NORMIE_TOKEN.twitter.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-twitter"
          >
            <Button variant="ghost" size="icon">
              <SiX className="h-4 w-4" />
            </Button>
          </a>
          <SoundToggle />
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            data-testid="button-theme-toggle"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="font-mono gap-2" data-testid="button-user-menu">
                  {isAdmin && <Shield className="h-3 w-3 text-primary" />}
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {user?.username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="font-mono">
                <DropdownMenuItem className="text-muted-foreground text-xs" disabled>
                  {user?.walletAddress 
                    ? `${user.walletAddress.slice(0, 4)}...${user.walletAddress.slice(-4)}`
                    : user?.email
                  }
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/profile")} data-testid="menu-profile">
                  <Settings className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => setLocation("/admin")} data-testid="menu-admin">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="font-mono gap-2"
              onClick={() => setShowAuthModal(true)}
              data-testid="button-login"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Connect</span>
            </Button>
          )}
        </div>
      </div>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />

      <div className="overflow-hidden border-t border-border">
        <div className="animate-ticker whitespace-nowrap py-1.5 px-4">
          <span className="inline-flex items-center gap-4 sm:gap-8 font-mono text-xs text-muted-foreground">
            {metrics && (
              <>
                <span>PRICE: {formatPrice(metrics.price)}</span>
                <span>MCAP: ${formatNumber(metrics.marketCap)}</span>
                <span>VOL 24H: ${formatNumber(metrics.volume24h)}</span>
                <span className="text-destructive">BURNED: {formatNumber(metrics.burnedTokens)}</span>
                <span className="text-chart-2">LOCKED: {formatNumber(metrics.lockedTokens)}</span>
                <span>HOLDERS: {formatNumber(metrics.holders)}</span>
                <span>PRICE: {formatPrice(metrics.price)}</span>
                <span>MCAP: ${formatNumber(metrics.marketCap)}</span>
                <span>VOL 24H: ${formatNumber(metrics.volume24h)}</span>
                <span className="text-destructive">BURNED: {formatNumber(metrics.burnedTokens)}</span>
                <span className="text-chart-2">LOCKED: {formatNumber(metrics.lockedTokens)}</span>
                <span>HOLDERS: {formatNumber(metrics.holders)}</span>
              </>
            )}
          </span>
        </div>
      </div>

      </header>
  );
}
