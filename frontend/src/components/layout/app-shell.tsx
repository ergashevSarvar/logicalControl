import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingScreen } from "@/components/common/loading-screen";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const sidebarStorageKey = "logical-control.sidebar.expanded";

function readSidebarPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  const storedValue = window.localStorage.getItem(sidebarStorageKey);
  return storedValue ? storedValue === "true" : false;
}

export function AppShell() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(readSidebarPreference);

  useEffect(() => {
    window.localStorage.setItem(sidebarStorageKey, String(isSidebarExpanded));
  }, [isSidebarExpanded]);

  if (isBootstrapping) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(var(--primary-rgb),0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),0.1),transparent_28%),linear-gradient(180deg,color-mix(in_srgb,var(--background)_96%,white_4%),color-mix(in_srgb,var(--background)_92%,rgba(var(--primary-rgb),0.04)_8%))]">
      <AppSidebar expanded={isSidebarExpanded} onToggle={() => setIsSidebarExpanded((current) => !current)} />

      <main
        className={cn(
          "min-h-screen transition-[padding] duration-300 ease-out",
          isSidebarExpanded ? "lg:pl-[17.25rem]" : "lg:pl-[7.5rem]",
        )}
      >
        <div className="min-h-screen p-4 md:p-6">
          <div className="mx-auto flex max-w-[1880px] flex-col gap-6">
            <Topbar expanded={isSidebarExpanded} onToggle={() => setIsSidebarExpanded((current) => !current)} />
            <MobileNav />
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
