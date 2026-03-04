import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExportSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-24" />
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="py-3">
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-28" />
              ))}
            </div>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
