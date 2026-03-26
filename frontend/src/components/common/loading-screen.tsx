export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="space-y-4 text-center">
        <div className="mx-auto size-16 rounded-[24px] border border-primary/30 bg-primary/10 p-4 shadow-lg shadow-primary/10">
          <div className="h-full w-full animate-pulse rounded-[18px] bg-primary/40" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Logical Control</h2>
          <p className="text-sm text-muted-foreground">Workspace is bootstrapping...</p>
        </div>
      </div>
    </div>
  );
}
