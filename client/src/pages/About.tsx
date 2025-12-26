import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-4 text-primary">About Normie Observer</h1>
        
        <p className="text-muted-foreground mb-8">
          Normie Observer is a real-time blockchain data platform dedicated to the Normie community, providing insights into $NORMIE token activity on Solana. It empowers users with live updates, transaction tracking, and community tools to stay connected to the Normie Nation ecosystem.
        </p>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>The Normie Movement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                The Normie movement, embodied by Normie Nation, is a community-driven Solana-based crypto project and lifestyle brand that champions everyday people—or "normies"—over insiders, whales, or hype-driven schemes. Founded on blue-collar "show up and ship" energy, it emphasizes proof of work (POW) through transparent execution, real-world business ethics, and long-term brand building, rather than short-term flips or rugs. Led by a dedicated CEO with a background in men's grooming and entrepreneurship, Normie Nation aims to make crypto accessible and authentic.
              </p>
              
              <p className="font-semibold text-foreground">Key ethos includes:</p>
              
              <ul className="space-y-3">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">&#9656;</span>
                  <span><strong className="text-foreground">Transparency and Legitimacy:</strong> Building in public with verifiable actions, such as locking over 52% of the supply until next year, burning 31 million tokens, and the CEO controlling 62% with personal investments (around $50,000 out-of-pocket) to demonstrate commitment.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">&#9656;</span>
                  <span><strong className="text-foreground">Community Focus:</strong> A flywheel of growth through merch (e.g., coffee, beanies, fitness lines), real-world events (like Tough Mudder or Vegas lounges), partnerships, apps, staking, and giveaways (e.g., Amazon gift cards).</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">&#9656;</span>
                  <span><strong className="text-foreground">Differentiation:</strong> Rapid achievements like CoinGecko listing in under 24 hours, Jupiter Verified status as the "First Normie on Sol," and OKX integration showcase execution over empty promises. The movement rejects "trust me bro" culture in favor of "watch me work," fostering organic growth via Telegram, X spaces, and community interactions.</span>
                </li>
              </ul>
              
              <p>
                Join the movement at{' '}
                <a 
                  href="https://normienation.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  normienation.com
                </a>
                {' '}or follow{' '}
                <a 
                  href="https://x.com/NormieCEO" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @NormieCEO
                </a>
                {' '}for updates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Version</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">1.0.0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Development</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Normie Observer was built by{' '}
                <a 
                  href="https://tryechomind.net" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Echo Mind Systems
                  <ExternalLink className="h-3 w-3" />
                </a>
                , a privacy-first AI automation agency specializing in real-time blockchain data platforms.
              </p>
              <p className="text-sm text-muted-foreground">
                Need custom automation solutions?{' '}
                <a href="mailto:braxton@tryechomind.net" className="text-primary hover:underline">
                  Get in touch
                </a>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Technology</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">&#9656;</span>
                  React + TypeScript
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">&#9656;</span>
                  Capacitor for iOS/Android
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">&#9656;</span>
                  Real-time Solana integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">&#9656;</span>
                  PostgreSQL database
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">&#9656;</span>
                  WebSocket real-time updates
                </li>
              </ul>
              <p className="text-sm text-muted-foreground italic mt-4">
                Powered by Echo Mind's automation framework
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Technical Support:</strong>{' '}
                <a href="mailto:support@tryechomind.net" className="text-primary hover:underline">
                  support@tryechomind.net
                </a>
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Business Inquiries:</strong>{' '}
                <a href="mailto:braxton@tryechomind.net" className="text-primary hover:underline">
                  braxton@tryechomind.net
                </a>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Legal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
              <p>
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Normie Observer
            <span className="mx-2 opacity-50">•</span>
            Built by{' '}
            <a 
              href="https://tryechomind.net" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Echo Mind Systems
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
