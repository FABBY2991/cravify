import type { Metadata } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Tracking } from "@/components/site/Tracking";

export const metadata: Metadata = {
  title: "Your order — Cravify",
  // A tracking link is private to whoever placed the order.
  robots: { index: false, follow: false },
};

export default async function OrderPage({ params }: PageProps<"/order/[token]">) {
  const { token } = await params;
  return (
    <ErrorBoundary title="Your order didn't load">
      <Tracking token={token} />
    </ErrorBoundary>
  );
}
