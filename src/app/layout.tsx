import type { Metadata, Viewport } from "next";
import { Anton, DM_Sans, Lilita_One } from "next/font/google";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });
const lilita = Lilita_One({ variable: "--font-lilita", subsets: ["latin"], weight: "400" });
const dm = DM_Sans({ variable: "--font-dm", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cravify — burgers, pizza, chicken, shakes & desserts",
  description:
    "Cravify is a concept food brand by Fabian: a full-stack demo with a live menu, cart, order tracking and admin board. Orders are not fulfilled.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7931E",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anton.variable} ${lilita.variable} ${dm.variable}`}>
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
