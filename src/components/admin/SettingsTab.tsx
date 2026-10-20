"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { type FormEvent, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Button, Field, inputClass, useRun, useToast } from "./ui";

type Settings = FunctionReturnType<typeof api.catalog.adminCatalog>["settings"];

export function SettingsTab() {
  const catalog = useQuery(api.catalog.adminCatalog);
  if (catalog === undefined) return <div className="shimmer h-72 max-w-xl rounded-3xl" />;
  return <SettingsForm settings={catalog.settings} />;
}

function SettingsForm({ settings }: { settings: Settings }) {
  const update = useMutation(api.settings.update);
  const run = useRun();
  const toast = useToast();
  const [form, setForm] = useState({ ...settings, deliveryFee: String(settings.deliveryFee) });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (await run(() => update({ ...form, deliveryFee: Number(form.deliveryFee) }))) toast({ tone: "info", title: "Settings saved" });
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-4 rounded-3xl bg-white p-6 ring-1 ring-line">
      <h2 className="text-lg font-bold">Site settings</h2>
      <Field label="Delivery fee (KES)" hint="Added to delivery orders. Pickup is always free.">
        <input value={form.deliveryFee} inputMode="numeric" onChange={(e) => setForm({ ...form, deliveryFee: e.target.value.replace(/\D/g, "") })} className={inputClass} />
      </Field>
      <Field label="Opening hours">
        <input value={form.hours} onChange={set("hours")} className={inputClass} />
      </Field>
      <Field label="Location" hint="Shown in the contact section. Keep it marked as a demo location.">
        <input value={form.location} onChange={set("location")} className={inputClass} />
      </Field>
      <Field label="Concept credit — name">
        <input value={form.creditName} onChange={set("creditName")} className={inputClass} />
      </Field>
      <Field label="Concept credit — link" hint="Optional. Must start with https://">
        <input value={form.creditUrl} onChange={set("creditUrl")} className={inputClass} placeholder="https://" />
      </Field>
      <Button type="submit" busy={busy}>
        Save settings
      </Button>
    </form>
  );
}
