import { Group, Panel, Separator } from "react-resizable-panels";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingScreen } from "@/components/common/loading-screen";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/providers/auth-provider";

export function AppShell() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Group id="logical-control.layout" orientation="horizontal" className="min-h-screen">
        <Panel defaultSize={21} minSize={18} maxSize={30} className="hidden min-h-screen border-r border-border/80 lg:block">
          <AppSidebar />
        </Panel>
        <Separator className="hidden w-px bg-border/80 transition hover:bg-primary/40 lg:block" />
        <Panel minSize={70}>
          <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(var(--primary-rgb),0.14),transparent_36%),radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),0.12),transparent_28%)] p-4 md:p-6">
            <div className="mx-auto flex max-w-[1520px] flex-col gap-6">
              <Topbar />
              <MobileNav />
              <Outlet />
            </div>
          </main>
        </Panel>
      </Group>
    </div>
  );
}
