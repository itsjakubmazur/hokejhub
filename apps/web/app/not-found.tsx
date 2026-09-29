import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[50dvh] place-items-center text-center">
      <div>
        <h1 className="text-xl font-semibold">Nenalezeno</h1>
        <Link href="/" className="mt-2 inline-block text-sm text-accent">
          Zpět na zápasy
        </Link>
      </div>
    </div>
  );
}
