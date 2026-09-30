import { CardSkeleton, ScoreboardSkeleton, TabsSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Načítám zápas">
      <ScoreboardSkeleton />
      <TabsSkeleton n={6} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton rows={6} photos />
        <CardSkeleton rows={6} />
      </div>
    </div>
  );
}
