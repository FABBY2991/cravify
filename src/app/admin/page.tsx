import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Admin — Cravify",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <ErrorBoundary title="The admin didn't load">
      <AdminApp />
    </ErrorBoundary>
  );
}
