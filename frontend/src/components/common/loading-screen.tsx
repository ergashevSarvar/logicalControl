import { AppLogo } from "@/components/common/app-logo";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="space-y-4 text-center">
        <AppLogo className="justify-center" imageClassName="size-16 animate-pulse" showText={false} />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Mantiqiy nazorat</h2>
          <p className="text-sm text-muted-foreground">Workspace is bootstrapping...</p>
        </div>
      </div>
    </div>
  );
}
