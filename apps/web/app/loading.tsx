export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="flex gap-1.5">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="skeleton h-12 w-14 rounded-xl" />
        ))}
      </div>
      <div className="skeleton h-8 w-64 rounded-lg" />
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
