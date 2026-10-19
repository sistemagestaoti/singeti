export default function AuthenticatedLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse w-full">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface/60 border border-border/40 p-5 rounded-2xl">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted/60 rounded-lg"></div>
          <div className="h-3.5 w-72 bg-muted/40 rounded-md"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-muted/50 rounded-xl"></div>
          <div className="h-9 w-32 bg-primary/20 rounded-xl"></div>
        </div>
      </div>

      {/* Cards KPI Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface/50 border border-border/40 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-muted/50"></div>
              <div className="h-3.5 w-14 bg-muted/40 rounded"></div>
            </div>
            <div className="h-7 w-20 bg-muted/60 rounded-lg"></div>
          </div>
        ))}
      </div>

      {/* Main Table / Grid Content Skeleton */}
      <div className="bg-surface/50 border border-border/40 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-border/30">
          <div className="h-5 w-40 bg-muted/50 rounded"></div>
          <div className="h-8 w-60 bg-muted/40 rounded-lg"></div>
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="h-12 w-full bg-muted/30 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
