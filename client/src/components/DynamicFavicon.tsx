import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface IconData {
  id: string;
  name: string;
  fileUrl: string;
}

const DEFAULT_FAVICON = "https://res.cloudinary.com/dmt4dpsnw/image/upload/v1765997164/Normie-Favicon_on9ov0.png";

export function DynamicFavicon() {
  const { user, isAuthenticated } = useAuth();
  const currentFaviconRef = useRef<string>(DEFAULT_FAVICON);
  
  const { data: icons = [] } = useQuery<IconData[]>({
    queryKey: ["/api/icons"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const updateAllFavicons = (iconUrl: string) => {
      if (currentFaviconRef.current === iconUrl) {
        return;
      }

      const allIconLinks = document.querySelectorAll("link[rel*='icon']");
      allIconLinks.forEach((link) => {
        const linkEl = link as HTMLLinkElement;
        if (linkEl.rel === "apple-touch-icon") {
          linkEl.href = iconUrl;
        } else if (linkEl.rel.includes("icon")) {
          linkEl.href = iconUrl;
          linkEl.type = iconUrl.endsWith(".svg") ? "image/svg+xml" : "image/png";
        }
      });

      if (allIconLinks.length === 0) {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.type = iconUrl.endsWith(".svg") ? "image/svg+xml" : "image/png";
        newLink.href = iconUrl;
        document.head.appendChild(newLink);
      }

      currentFaviconRef.current = iconUrl;
    };

    if (isAuthenticated && user?.selectedIconId && icons.length > 0) {
      const selectedIcon = icons.find(icon => icon.id === user.selectedIconId);
      if (selectedIcon) {
        updateAllFavicons(selectedIcon.fileUrl);
        return;
      }
    }

    updateAllFavicons(DEFAULT_FAVICON);
  }, [user?.selectedIconId, icons, isAuthenticated]);

  return null;
}
