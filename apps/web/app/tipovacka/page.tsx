import type { Metadata } from "next";
import { TipLeague } from "@/components/tip-league";

export const metadata: Metadata = { title: "Tipovačka" };

export default function TipsPage() {
  return <TipLeague />;
}
