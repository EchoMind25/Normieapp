import { Button } from "@/components/ui/button";
import { Terminal, Copy, Check, ExternalLink, Download } from "lucide-react";
import { SiTelegram, SiX, SiSolana } from "react-icons/si";
import { NORMIE_TOKEN } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { FeedbackForm } from "./FeedbackForm";
import { Link } from "wouter";

export function Footer() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyAddress = () => {
    navigator.clipboard.writeText(NORMIE_TOKEN.address);
    setCopied(true);
    toast({
      title: "Address copied!",
      description: "Token address copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="border-t border-border bg-card/50 py-8 sm:py-12 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-6 w-6 text-primary" />
              <span className="font-mono text-lg font-bold">{NORMIE_TOKEN.symbol}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {NORMIE_TOKEN.description}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={`https://t.me/${NORMIE_TOKEN.telegram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="footer-link-telegram"
              >
                <Button variant="ghost" size="icon">
                  <SiTelegram className="h-5 w-5" />
                </Button>
              </a>
              <a
                href={`https://x.com/${NORMIE_TOKEN.twitter.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="footer-link-twitter"
              >
                <Button variant="ghost" size="icon">
                  <SiX className="h-5 w-5" />
                </Button>
              </a>
              <a
                href={`https://pump.fun/coin/${NORMIE_TOKEN.address}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="footer-link-pumpfun"
              >
                <Button variant="ghost" size="icon">
                  <SiSolana className="h-5 w-5" />
                </Button>
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-mono font-bold uppercase text-sm tracking-wider">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => scrollToSection("dashboard")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                data-testid="footer-nav-dashboard"
              >
                Dashboard
              </button>
              <button
                onClick={() => scrollToSection("meme-generator")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                data-testid="footer-nav-memes"
              >
                Meme Generator
              </button>
              <button
                onClick={() => scrollToSection("shop")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                data-testid="footer-nav-shop"
              >
                Merch Shop
              </button>
              <button
                onClick={() => scrollToSection("community")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                data-testid="footer-nav-community"
              >
                Community
              </button>
              <Link
                href="/install"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                data-testid="footer-nav-install"
              >
                <Download className="h-3 w-3" />
                Install App
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h4 className="font-mono font-bold uppercase text-sm tracking-wider">Community</h4>
            <nav className="flex flex-col gap-2">
              <a
                href={`https://t.me/${NORMIE_TOKEN.telegram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                data-testid="footer-community-telegram"
              >
                Telegram <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://x.com/${NORMIE_TOKEN.twitter.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                data-testid="footer-community-twitter"
              >
                X (Twitter) <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://pump.fun/coin/${NORMIE_TOKEN.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                data-testid="footer-community-pumpfun"
              >
                pump.fun <ExternalLink className="h-3 w-3" />
              </a>
            </nav>
          </div>

          <div className="space-y-4">
            <h4 className="font-mono font-bold uppercase text-sm tracking-wider">Contract</h4>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Token Address (Solana)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-muted p-2 rounded-md break-all">
                  {NORMIE_TOKEN.address}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyAddress}
                  data-testid="button-copy-address"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 sm:pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            <p className="text-xs text-muted-foreground text-center md:text-left">
              This is a community-built companion app. Not financial advice. DYOR. Ape responsibly.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <FeedbackForm />
              <span>Built with chaos</span>
              <span className="text-primary">by Normies, for Normies</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
