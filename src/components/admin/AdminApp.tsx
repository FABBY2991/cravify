"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { readStored, writeStored } from "@/lib/storage";
import { HeroTab } from "./HeroTab";
import { MenuTab } from "./MenuTab";
import { OrdersTab } from "./OrdersTab";
import { SettingsTab } from "./SettingsTab";
import { SignIn } from "./SignIn";
import { Button, Toasts } from "./ui";

const TABS = [
  ["orders", "Orders"],
  ["menu", "Menu"],
  ["hero", "Hero"],
  ["settings", "Settings"],
] as const;
type Tab = (typeof TABS)[number][0];

export function AdminApp() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.admin.me, isAuthenticated ? {} : "skip");

  if (isLoading || (isAuthenticated && me === undefined)) {
    return (
      <main className="grid min-h-svh place-items-center bg-cream" aria-busy="true">
        <p className="font-logo text-4xl text-ink/30">Cravify!</p>
      </main>
    );
  }
  if (!isAuthenticated || !me) return <SignIn />;
  if (!me.isAdmin) return <NotAdmin email={me.email} />;
  return (
    <Toasts>
      <Dashboard email={me.email ?? ""} />
    </Toasts>
  );
}

function NotAdmin({ email }: { email: string | null }) {
  const { signOut } = useAuthActions();
  return (
    <main className="grid min-h-svh place-items-center bg-cream px-4 text-center">
      <div className="max-w-sm">
        <h1 className="font-display text-5xl uppercase">Not an admin</h1>
        <p className="mt-3 text-muted">{email ?? "This account"} isn&apos;t on Cravify&apos;s admin list.</p>
        <Button className="mt-6" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </main>
  );
}

function Dashboard({ email }: { email: string }) {
  const { signOut } = useAuthActions();
  // The last tab is remembered per browser, as a convenience only.
  const [tab, setTab] = useState<Tab>(() => {
    const saved = readStored<string>("cravify.admin.tab", "orders");
    return TABS.some(([key]) => key === saved) ? (saved as Tab) : "orders";
  });
  const choose = (next: Tab) => {
    setTab(next);
    writeStored("cravify.admin.tab", next);
  };

  return (
    <div className="min-h-svh bg-[#FBF5EE]">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-6">
          <p className="font-logo text-2xl">
            Cravify<span className="text-brand">!</span> <span className="font-sans text-sm font-bold text-muted">Admin</span>
          </p>
          <nav aria-label="Admin sections" className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => choose(key)}
                aria-current={tab === key ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${tab === key ? "bg-ink text-white" : "text-muted hover:bg-black/5 hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Link href="/" target="_blank" className="hidden items-center gap-1 font-semibold text-muted hover:text-ink sm:inline-flex">
              View site <ExternalLink className="size-3.5" aria-hidden />
            </Link>
            <span className="hidden max-w-48 truncate text-muted lg:inline">{email}</span>
            <Button tone="light" onClick={() => void signOut()} className="!px-3">
              <LogOut className="size-4" aria-hidden /> <span className="sr-only sm:not-sr-only">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-6">
        {tab === "orders" && <OrdersTab />}
        {tab === "menu" && <MenuTab />}
        {tab === "hero" && <HeroTab />}
        {tab === "settings" && <SettingsTab />}
      </main>
    </div>
  );
}
