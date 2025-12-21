import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense, useEffect, useState, Component, type ReactNode } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SoundProvider } from "@/components/SoundEffects";
import { ForcePasswordChange } from "@/components/ForcePasswordChange";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { DynamicFavicon } from "@/components/DynamicFavicon";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SplashScreen } from "@/components/SplashScreen";
import { RateAppPrompt } from "@/components/RateAppPrompt";
import { ConsentBanner } from "@/components/ConsentBanner";
import { AgeGate } from "@/components/AgeGate";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { initStatusBar, hideSplashScreen, isNative } from "@/lib/native-utils";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

// Error Boundary to catch lazy loading and rendering errors
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <h1 className="text-xl font-bold">Something went wrong</h1>
              </div>
              <p className="text-muted-foreground mb-4">
                The page failed to load. This can happen when navigating quickly between pages.
              </p>
              <Button onClick={this.handleRetry} className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

const Profile = lazy(() => import("@/pages/Profile"));
const Admin = lazy(() => import("@/pages/Admin"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const NftDetail = lazy(() => import("@/pages/NftDetail"));
const MyNfts = lazy(() => import("@/pages/MyNfts"));
const CollectionDetail = lazy(() => import("@/pages/CollectionDetail"));
const EmbedChart = lazy(() => import("@/pages/EmbedChart"));
const Install = lazy(() => import("@/pages/Install"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const MemeGeneratorPage = lazy(() => import("@/pages/MemeGeneratorPage"));
const ArtGalleryPage = lazy(() => import("@/pages/ArtGalleryPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="space-y-4 w-full max-w-md px-4">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

// Global scroll reset on route changes
function useScrollReset() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Force scroll to top on every route change
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Clear any hash fragments that might cause auto-scroll
    // (hash always starts with # so we check if it has content after #)
    if (window.location.hash && window.location.hash.length > 1) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [location]);
}

function Router() {
  useScrollReset();
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/profile" component={Profile} />
          <Route path="/admin" component={Admin} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/marketplace/nft/:id" component={NftDetail} />
          <Route path="/marketplace/my-nfts" component={MyNfts} />
          <Route path="/marketplace/collection/:id" component={CollectionDetail} />
          <Route path="/embed/chart" component={EmbedChart} />
          <Route path="/install" component={Install} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/meme-generator" component={MemeGeneratorPage} />
          <Route path="/art-gallery" component={ArtGalleryPage} />
          <Route path="/chat" component={ChatPage} />
          <Route path="/messages" component={MessagesPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (isNative) {
      initStatusBar();
      hideSplashScreen();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SoundProvider>
          <TooltipProvider>
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
            <DynamicFavicon />
            <Toaster />
            <OfflineBanner />
            <ConsentBanner />
            <AgeGate />
            <DisclaimerModal />
            <ForcePasswordChange />
            <NotificationPrompt />
            <PWAInstallPrompt />
            <RateAppPrompt />
            <Router />
          </TooltipProvider>
        </SoundProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
