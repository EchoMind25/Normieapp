import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Calendar } from "lucide-react";

export function AgeGate() {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check server-side age verification status
    fetch("/api/auth/age-status", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.verified) {
          setShowDialog(true);
        }
        setIsLoading(false);
      })
      .catch(() => {
        // Fallback to localStorage if server check fails
        const localVerified = localStorage.getItem("normie_age_verified");
        if (!localVerified) {
          setShowDialog(true);
        }
        setIsLoading(false);
      });
  }, []);

  const handleConfirm = async () => {
    try {
      // Set server-side age verification
      await fetch("/api/auth/verify-age", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirmed: true }),
      });
      // Also set localStorage as backup
      localStorage.setItem("normie_age_verified", new Date().toISOString());
    } catch (error) {
      // Still set localStorage if server fails
      localStorage.setItem("normie_age_verified", new Date().toISOString());
    }
    setShowDialog(false);
  };

  const handleDecline = () => {
    window.location.href = "https://www.google.com";
  };

  if (!showDialog) return null;

  return (
    <AlertDialog open={showDialog}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Age Verification Required
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3">
            <p>
              This application involves cryptocurrency and financial content. 
              By continuing, you confirm that:
            </p>
            <ul className="text-left space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Calendar className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>You are at least 18 years of age (or the legal age in your jurisdiction)</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>You understand cryptocurrency investments carry significant risk</span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground pt-2">
              This app is not intended for minors. Please exit if you do not meet these requirements.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDecline}
            className="w-full sm:w-auto"
            data-testid="button-age-decline"
          >
            I am under 18
          </Button>
          <AlertDialogAction
            onClick={handleConfirm}
            className="w-full sm:w-auto"
            data-testid="button-age-confirm"
          >
            I am 18 or older
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AgeGate;
