import { Switch, Route } from "wouter";
import { lazy, Suspense, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { initStatusBar, hideSplashScreen, isNative } from "@/lib/native-utils";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

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

function Router() {
  return (
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
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
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
            <DynamicFavicon />
            <Toaster />
            <OfflineBanner />
            <DisclaimerModal />
            <ForcePasswordChange />
            <NotificationPrompt />
            <PWAInstallPrompt />
            <Router />
          </TooltipProvider>
        </SoundProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
