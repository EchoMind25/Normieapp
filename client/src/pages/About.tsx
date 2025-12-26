/**
 * Normie Observer - Solana Memecoin & NFT Tracker
 * 
 * Built by Echo Mind Systems
 * https://tryechomind.net
 * 
 * @author Braxton <braxton@tryechomind.net>
 * @copyright 2024 Echo Mind Systems
 * @license Proprietary
 */

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

        <h1 className="text-3xl font-bold mb-8 text-primary">About Normie Observer</h1>
        
        <div className="space-y-6">
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
