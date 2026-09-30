import { CardSkeleton, HeroSkeleton, TabsSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Načítám ligu">
      <HeroSkeleton />
      <TabsSkeleton n={7} />
      <CardSkeleton rows={14} />
    </div>
  );
}
