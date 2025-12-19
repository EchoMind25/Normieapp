import { Activity, Image, TrendingUp, BarChart3, Bell, Settings, Users } from "lucide-react";

interface AdminMobileNavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingCount: number;
}

export function AdminMobileNavbar({ activeTab, onTabChange, pendingCount }: AdminMobileNavbarProps) {
  const tabs = [
    { id: "overview", icon: Activity, label: "Overview" },
    { id: "users", icon: Users, label: "Users" },
    { id: "gallery", icon: Image, label: "Gallery", badge: pendingCount > 0 ? pendingCount : undefined },
    { id: "chart", icon: TrendingUp, label: "Chart" },
    { id: "polls", icon: BarChart3, label: "Polls" },
    { id: "notifications", icon: Bell, label: "Alerts" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 min-w-[60px] h-full gap-0.5 transition-colors relative ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid={`mobile-admin-nav-${tab.id}`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
