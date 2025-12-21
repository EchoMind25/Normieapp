import { lazy, Suspense } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const MemeGenerator = lazy(() => import("@/components/MemeGenerator").then(m => ({ default: m.MemeGenerator })));

function MemeGeneratorLoader() {
  return (
    <Card className="p-6 m-4">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </Card>
  );
}

export default function MemeGeneratorPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4 lg:px-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="font-mono text-lg font-bold">Meme Generator</h1>
        </div>
      </header>
      <main className="pb-8">
        <Suspense fallback={<MemeGeneratorLoader />}>
          <MemeGenerator />
        </Suspense>
      </main>
    </div>
  );
}
