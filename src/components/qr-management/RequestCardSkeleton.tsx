export function RequestCardSkeleton() {
  return (
    <div className="w-full p-3 rounded-lg border border-border bg-muted/20">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-24 bg-muted rounded shimmer" />
            <div className="h-3 w-3 bg-muted rounded-full shimmer" />
          </div>
          <div className="h-3 w-32 bg-muted rounded shimmer" />
        </div>
        <div className="h-5 w-16 bg-muted rounded shimmer" />
      </div>

      {/* Context Preview Skeleton */}
      <div className="space-y-2 mt-3 p-2 bg-background/50 rounded border border-border">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-muted rounded-full shimmer" />
          <div className="h-3 w-20 bg-muted rounded shimmer" />
        </div>
        
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <div className="h-3 w-28 bg-muted rounded shimmer" />
            <div className="h-3 w-16 bg-muted rounded shimmer" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-24 bg-muted rounded shimmer" />
            <div className="h-3 w-12 bg-muted rounded shimmer" />
          </div>
        </div>
        
        <div className="flex justify-between pt-2 mt-2 border-t border-border">
          <div className="h-3 w-12 bg-muted rounded shimmer" />
          <div className="h-4 w-20 bg-muted rounded shimmer" />
        </div>
      </div>
    </div>
  );
}
