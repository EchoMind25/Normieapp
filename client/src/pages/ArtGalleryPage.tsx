import { Link } from "wouter";
import { ArtGallery } from "@/components/ArtGallery";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ArtGalleryPage() {
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
          <h1 className="font-mono text-lg font-bold">Art Gallery</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <ArtGallery />
      </main>
    </div>
  );
}
