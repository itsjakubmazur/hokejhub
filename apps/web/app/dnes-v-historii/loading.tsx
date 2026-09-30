import { CardSkeleton, HeroSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Načítám">
      <HeroSkeleton />
      <div className="grid gap-4 md:grid-cols-2">
        <CardSkeleton rows={6} photos />
        <CardSkeleton rows={6} photos />
      </div>
    </div>
  );
}
