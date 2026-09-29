import type { Metadata } from "next";
import { NotificationSettings } from "@/components/notification-settings";

export const metadata: Metadata = { title: "Upozornění" };

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="rise">
        <h1 className="text-3xl font-black tracking-tight">Upozornění</h1>
        <p className="mt-1 text-sm text-muted">
          Góly, začátky, napínavé koncovky a výsledky přímo do telefonu – i když máš aplikaci zavřenou. Na iPhonu nejdřív přidej HokejHub na plochu
          (Sdílet → Přidat na plochu) a otevři ho odtud.
        </p>
      </header>
      <NotificationSettings vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
    </div>
  );
}
