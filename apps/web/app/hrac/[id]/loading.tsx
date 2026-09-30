import { CardSkeleton, HeroSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Načítám hráče">
      <HeroSkeleton tall portrait />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-16" />
        ))}
      </div>
      <CardSkeleton rows={8} />
    </div>
  );
}
