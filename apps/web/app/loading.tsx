import { PuckLoader } from "@/components/puck-loader";

export default function Loading() {
  return (
    <div className="space-y-5">
      <PuckLoader />
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-32 rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </div>
  );
}
