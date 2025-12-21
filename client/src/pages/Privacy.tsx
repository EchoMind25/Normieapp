import { Link } from 'wouter';
import { ArrowLeft, Shield, Lock, Eye, Database, Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const POLICY_DATE = 'December 20, 2025';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-mono font-bold uppercase tracking-wide">Privacy Policy</h1>
            <p className="text-xs text-muted-foreground">Last updated: {POLICY_DATE}</p>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              <Shield className="w-5 h-5 text-primary" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <p className="text-muted-foreground">
              Normie Observer ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the "Service").
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              <Database className="w-5 h-5 text-primary" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">Publicly Available Blockchain Data</h3>
              <p className="text-sm text-muted-foreground mb-2">
                We primarily use publicly available blockchain data from the Solana network. This includes token prices, transaction volumes, and wallet activity that is already public on the blockchain. We do not access any private or off-chain data.
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Token price and market data from public blockchain APIs</li>
                <li>Transaction history visible on the public ledger</li>
                <li>Wallet addresses displayed in shortened/hashed format for privacy</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Information You Provide</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Account information (username, email address) if you create an account</li>
                <li>Wallet addresses you choose to connect (we never store private keys or seed phrases)</li>
                <li>User-generated content such as memes and community posts</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Minimal Analytics</h3>
              <p className="text-sm text-muted-foreground mb-2">
                We believe in respecting your privacy. We only collect basic, non-invasive analytics:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Pages visited and when (basic navigation tracking)</li>
                <li>Button clicks and feature usage (to improve the app)</li>
                <li>Error logs for debugging purposes only</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                We do not use invasive tracking, behavioral profiling, or sell your data to advertisers.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              <Eye className="w-5 h-5 text-primary" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              <li>Provide, maintain, and improve our Service</li>
              <li>Send price alerts and notifications you've requested</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Monitor and analyze usage trends to improve user experience</li>
              <li>Detect, prevent, and address technical issues and abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              <Lock className="w-5 h-5 text-primary" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We implement appropriate technical and organizational security measures to protect your personal information, including:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Secure database storage with access controls</li>
              <li>Regular security audits and monitoring</li>
              <li>No storage of cryptocurrency private keys or seed phrases</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              <Globe className="w-5 h-5 text-primary" />
              Third-Party Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We may share information with third-party service providers that help us operate our Service:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Cloud hosting providers (data storage and processing)</li>
              <li>Analytics services (usage statistics, crash reporting)</li>
              <li>Blockchain data providers (price data, transaction information)</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              We do not sell your personal information to third parties.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              Your Rights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability (receive your data in a structured format)</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              <Mail className="w-5 h-5 text-primary" />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
            </p>
            <div className="mt-4 p-4 rounded-md bg-muted/30">
              <p className="text-sm font-mono">Email: support@tryechomind.net</p>
              <p className="text-sm font-mono">Website: https://normie.observer</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              Children's Privacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Our Service is not intended for users under the age of 17. We do not knowingly collect personal information from children under 17. If you believe we have collected information from a child under 17, please contact us immediately.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              Changes to This Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically.
            </p>
          </CardContent>
        </Card>

        <div className="text-center py-8">
          <Link href="/">
            <Button variant="outline" className="font-mono uppercase" data-testid="button-back-to-app">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to App
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
