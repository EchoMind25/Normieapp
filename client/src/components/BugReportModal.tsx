import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bug, Camera, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface BugReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImageAuditResult {
  totalImages: number;
  brokenImages: { src: string; alt: string }[];
  timestamp: number;
}

export function BugReportModal({ open, onOpenChange }: BugReportModalProps) {
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [imageAudit, setImageAudit] = useState<ImageAuditResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const auditImages = useCallback((): ImageAuditResult => {
    const images = document.querySelectorAll("img");
    const brokenImages: { src: string; alt: string }[] = [];

    images.forEach((img) => {
      if (!img.complete || img.naturalWidth === 0) {
        brokenImages.push({
          src: img.src || "unknown",
          alt: img.alt || "no alt text",
        });
      }
    });

    return {
      totalImages: images.length,
      brokenImages,
      timestamp: Date.now(),
    };
  }, []);

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);

    try {
      const audit = auditImages();
      setImageAudit(audit);

      try {
        const html2canvas = (await import("html2canvas")).default;
        
        // Hide dialog temporarily for screenshot
        const dialogs = document.querySelectorAll('[role="dialog"]');
        dialogs.forEach((el) => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
        
        // Small delay to allow DOM to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = await html2canvas(document.body, {
          useCORS: true,
          allowTaint: true,
          logging: false,
          scale: 0.5,
          backgroundColor: '#000000',
          removeContainer: true,
          foreignObjectRendering: false,
          ignoreElements: (element) => {
            // Ignore dialogs and any hidden elements
            if (element.closest('[role="dialog"]')) return true;
            if (element.tagName === 'NOSCRIPT') return true;
            return false;
          },
        });

        // Restore dialog visibility
        dialogs.forEach((el) => {
          (el as HTMLElement).style.visibility = 'visible';
        });

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setScreenshot(dataUrl);

        toast({
          title: "Screenshot captured",
          description: `Captured ${audit.totalImages} images, ${audit.brokenImages.length} broken`,
        });
      } catch (canvasError) {
        // Restore dialog visibility on error
        const dialogs = document.querySelectorAll('[role="dialog"]');
        dialogs.forEach((el) => {
          (el as HTMLElement).style.visibility = 'visible';
        });
        
        console.error("Screenshot capture error:", canvasError);
        toast({
          title: "Screenshot unavailable",
          description: "Image audit completed without screenshot",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Capture failed:", error);
      toast({
        title: "Capture failed",
        description: "Could not capture page state",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  }, [auditImages, toast]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please describe the issue you encountered",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const performanceMetrics = {
        memory: (performance as any).memory?.usedJSHeapSize,
        timing: performance.timing?.loadEventEnd - performance.timing?.navigationStart,
      };

      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      };

      await apiRequest("/api/bug-report", {
        method: "POST",
        body: JSON.stringify({
          description: description.trim(),
          screenshot,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          imageAudit,
          brokenImages: imageAudit?.brokenImages || [],
          viewport,
          performanceMetrics,
        }),
      });

      setSubmitted(true);
      toast({
        title: "Report submitted",
        description: "Thank you for helping us improve the app",
      });

      setTimeout(() => {
        setDescription("");
        setScreenshot(null);
        setImageAudit(null);
        setSubmitted(false);
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      toast({
        title: "Submission failed",
        description: "Please email support@tryechomind.net",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setDescription("");
      setScreenshot(null);
      setImageAudit(null);
      setSubmitted(false);
      onOpenChange(false);
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <DialogTitle className="text-center">Report Submitted</DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              Thank you for your feedback. We'll review your report soon.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Report a Bug
          </DialogTitle>
          <DialogDescription>
            Help us improve by reporting issues you encounter
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">What went wrong?</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              data-testid="textarea-bug-description"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={captureScreenshot}
              disabled={isCapturing}
              data-testid="button-capture-screenshot"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Screenshot
                </>
              )}
            </Button>

            {screenshot && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Screenshot ready
              </span>
            )}
          </div>

          {imageAudit && (
            <div className="p-3 rounded-md bg-muted/50 text-sm">
              <div className="flex items-center gap-2 mb-1">
                {imageAudit.brokenImages.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                <span className="font-medium">Image Audit</span>
              </div>
              <p className="text-muted-foreground">
                {imageAudit.totalImages} images found, {imageAudit.brokenImages.length} broken
              </p>
              {imageAudit.brokenImages.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {imageAudit.brokenImages.slice(0, 3).map((img, i) => (
                    <li key={i} className="truncate">
                      {img.alt || img.src.slice(0, 50)}
                    </li>
                  ))}
                  {imageAudit.brokenImages.length > 3 && (
                    <li>...and {imageAudit.brokenImages.length - 3} more</li>
                  )}
                </ul>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Your current page URL and browser info will be included automatically.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !description.trim()}
            data-testid="button-submit-bug-report"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
