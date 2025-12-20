import { Link } from 'wouter';
import { ArrowLeft, FileText, AlertTriangle, Ban, Scale, Users, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Terms() {
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
            <h1 className="font-mono font-bold uppercase tracking-wide">Terms of Service</h1>
            <p className="text-xs text-muted-foreground">Last updated: December 2025</p>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              <FileText className="w-5 h-5 text-primary" />
              Agreement to Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <p className="text-muted-foreground">
              By accessing or using Normie Observer ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Risk Warning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm font-semibold text-amber-200 mb-2">
                IMPORTANT FINANCIAL RISK DISCLOSURE
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>Cryptocurrency and NFT investments are highly speculative and volatile</li>
                <li>You may lose some or all of your investment</li>
                <li>Past performance is not indicative of future results</li>
                <li>This app provides informational data only, NOT financial advice</li>
                <li>Always conduct your own research before making investment decisions</li>
                <li>Never invest more than you can afford to lose</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              THE INFORMATION PROVIDED BY THIS SERVICE IS FOR EDUCATIONAL AND INFORMATIONAL PURPOSES ONLY. IT SHOULD NOT BE CONSTRUED AS FINANCIAL, INVESTMENT, TAX, OR LEGAL ADVICE.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              Description of Service
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Normie Observer provides:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Real-time price tracking for Solana-based tokens and NFTs</li>
              <li>Historical price charts and market data</li>
              <li>Price alert notifications</li>
              <li>Community features (forums, meme generator)</li>
              <li>Educational content about blockchain and NFTs</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4 font-semibold">
              WE DO NOT:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Facilitate the purchase, sale, or exchange of cryptocurrency or NFTs</li>
              <li>Store or manage cryptocurrency wallets or private keys</li>
              <li>Provide financial, investment, tax, or legal advice</li>
              <li>Guarantee the accuracy of any price or market data</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              <Users className="w-5 h-5 text-primary" />
              Eligibility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You must be at least 17 years old to use this Service. By using the Service, you represent and warrant that:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-4">
              <li>You are at least 17 years of age</li>
              <li>You have the legal capacity to enter into this agreement</li>
              <li>You are not barred from using the Service under applicable law</li>
              <li>You will comply with all applicable laws and regulations</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              <Ban className="w-5 h-5 text-destructive" />
              Prohibited Uses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You agree NOT to use the Service for:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Any illegal or unauthorized purpose</li>
              <li>Harassment, abuse, or harm to others</li>
              <li>Posting false, misleading, or defamatory content</li>
              <li>Impersonating others or misrepresenting your identity</li>
              <li>Attempting to gain unauthorized access to the Service</li>
              <li>Interfering with or disrupting the Service</li>
              <li>Automated scraping or data collection without permission</li>
              <li>Market manipulation or pump-and-dump schemes</li>
              <li>Money laundering or terrorist financing</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              User Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You retain ownership of content you create and post on the Service (memes, posts, comments). By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content within the Service.
            </p>
            <p className="text-sm text-muted-foreground">
              You are responsible for your content and must ensure it does not violate any laws, infringe on intellectual property rights, or violate these Terms.
            </p>
            <p className="text-sm text-muted-foreground">
              We reserve the right to remove any content that violates these Terms or is otherwise objectionable.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              <Scale className="w-5 h-5 text-primary" />
              Disclaimer of Warranties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground uppercase">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED.
            </p>
            <p className="text-sm text-muted-foreground">
              We do not warrant that:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>The Service will be uninterrupted, secure, or error-free</li>
              <li>The data or information provided is accurate, reliable, or complete</li>
              <li>Any errors will be corrected</li>
              <li>The Service is free from viruses or harmful components</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              Limitation of Liability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground uppercase">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, NORMIE OBSERVER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              We are not responsible for any financial losses you may incur as a result of trading decisions made based on information provided by the Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              <Gavel className="w-5 h-5 text-primary" />
              Governing Law
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              Changes to Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will notify users of significant changes by posting a notice on the Service. Your continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono uppercase">
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              For questions about these Terms, please contact us:
            </p>
            <div className="mt-4 p-4 rounded-md bg-muted/30">
              <p className="text-sm font-mono">Email: legal@normie.observer</p>
              <p className="text-sm font-mono">Website: https://normie.observer</p>
            </div>
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
