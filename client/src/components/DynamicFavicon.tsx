import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface IconData {
  id: string;
  name: string;
  fileUrl: string;
}

const DEFAULT_FAVICON = "/favicon.ico";

export function DynamicFavicon() {
  const { user, isAuthenticated } = useAuth();
  const currentFaviconRef = useRef<string>(DEFAULT_FAVICON);
  
  const { data: icons = [] } = useQuery<IconData[]>({
    queryKey: ["/api/icons"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const updateFavicon = (iconUrl: string) => {
      if (currentFaviconRef.current === iconUrl) {
        return;
      }
      
      let existingLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      
      if (!existingLink) {
        existingLink = document.createElement("link");
        existingLink.rel = "icon";
        document.head.appendChild(existingLink);
      }
      
      existingLink.type = iconUrl.endsWith(".svg") ? "image/svg+xml" : "image/x-icon";
      existingLink.href = iconUrl;
      currentFaviconRef.current = iconUrl;
    };

    if (isAuthenticated && user?.selectedIconId && icons.length > 0) {
      const selectedIcon = icons.find(icon => icon.id === user.selectedIconId);
      if (selectedIcon) {
        updateFavicon(selectedIcon.fileUrl);
        return;
      }
    }

    updateFavicon(DEFAULT_FAVICON);
  }, [user?.selectedIconId, icons, isAuthenticated]);

  return null;
}
