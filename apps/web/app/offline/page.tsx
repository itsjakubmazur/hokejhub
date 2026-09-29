export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <div className="grid min-h-[60dvh] place-items-center text-center">
      <div>
        <p className="text-4xl">🏒</p>
        <h1 className="mt-3 text-xl font-semibold">Jste offline</h1>
        <p className="mt-1 text-sm text-muted">Jakmile bude připojení zpět, data se automaticky načtou.</p>
      </div>
    </div>
  );
}
