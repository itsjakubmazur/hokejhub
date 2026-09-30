import { CardSkeleton, HeroSkeleton, TabsSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Načítám tým">
      <HeroSkeleton tall portrait />
      <TabsSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton rows={7} photos />
        <CardSkeleton rows={7} />
      </div>
    </div>
  );
}
