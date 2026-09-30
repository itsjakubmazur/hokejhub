import type { Metadata } from "next";
import { BellRing } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { NotificationSettings } from "@/components/notification-settings";

export const metadata: Metadata = { title: "Upozornění" };

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHero kicker="Push notifikace" title="Upozornění" icon={BellRing}>
        <p>
          Góly, začátky, napínavé koncovky a výsledky přímo do telefonu – i když máš aplikaci zavřenou. Na iPhonu nejdřív přidej HokejHub na plochu
          (Sdílet → Přidat na plochu) a otevři ho odtud.
        </p>
      </PageHero>
      <NotificationSettings vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
    </div>
  );
}
