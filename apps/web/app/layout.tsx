import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import { Providers } from "@/components/providers";
import { BottomNav } from "@/components/bottom-nav";
import { Header } from "@/components/header";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin", "latin-ext"] });
const shoulders = Big_Shoulders({ variable: "--font-shoulders", subsets: ["latin", "latin-ext"], axes: ["opsz"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://hokejhub.vercel.app",
  ),
  title: { default: "HokejHub", template: "%s · HokejHub" },
  description: "Živé výsledky, kurzy a analytika – české ligy a NHL.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "HokejHub" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c1318" },
    { media: "(prefers-color-scheme: light)", color: "#eef2f5" },
  ],
  viewportFit: "cover",
};

// Runs before paint so the stored theme never flashes.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(!t)t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={`${archivo.variable} ${shoulders.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pb-24">{children}</main>
          <BottomNav />
        </Providers>
        <SwRegister />
      </body>
    </html>
  );
}
