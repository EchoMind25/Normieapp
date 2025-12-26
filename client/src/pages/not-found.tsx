import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>

          <div className="mt-6">
            <Link href="/" className="text-primary hover:underline">
              Go Home
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Having issues?{' '}
              <a href="mailto:support@tryechomind.net" className="text-primary hover:underline">
                Contact Support
              </a>
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
        </CardContent>
      </Card>
    </div>
  );
}
