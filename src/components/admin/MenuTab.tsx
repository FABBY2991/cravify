"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CATEGORY_ICONS, MAX_SIZES } from "../../../convex/lib/limits";
import { CategoryIcon } from "@/components/CategoryIcon";
import { inkOn } from "@/lib/color";
import { kes } from "@/lib/format";
import { Button, ColorInput, Confirm, Field, ImageField, inputClass, MoveButtons, Toggle, useRun, useToast } from "./ui";

type Catalog = FunctionReturnType<typeof api.catalog.adminCatalog>;
type Category = Catalog["categories"][number];
type Item = Category["items"][number];
type SizeDraft = { label: string; price: string };

export function MenuTab() {
  const catalog = useQuery(api.catalog.adminCatalog);
  const [selectedId, setSelectedId] = useState<Id<"categories"> | null>(null);

  if (catalog === undefined) return <div className="shimmer h-96 rounded-3xl" />;
  const selected = catalog.categories.find((c) => c._id === selectedId) ?? catalog.categories[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-4">
        <section className="rounded-3xl bg-white p-3 ring-1 ring-line" aria-label="Categories">
          <h2 className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-muted">Categories</h2>
          <ul className="space-y-1">
            {catalog.categories.map((category) => (
              <li key={category._id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(category._id)}
                  aria-current={selected?._id === category._id ? "true" : undefined}
                  className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left text-sm font-bold transition ${
                    selected?._id === category._id ? "bg-cream ring-1 ring-line" : "hover:bg-black/5"
                  }`}
                >
                  <span className="grid size-8 place-items-center rounded-xl" style={{ background: category.color, color: inkOn(category.color) }}>
                    <CategoryIcon icon={category.icon} className="size-4" />
                  </span>
                  <span className="flex-1">{category.name}</span>
                  {!category.enabled && <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] uppercase text-muted">Hidden</span>}
                  <span className="text-xs font-normal text-muted">{category.items.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <NewCategory onCreated={setSelectedId} />
      </aside>

      {selected ? (
        <CategoryPanel key={selected._id} category={selected} />
      ) : (
        <p className="rounded-3xl bg-white p-10 text-center text-muted ring-1 ring-line">Add a first category to start the menu.</p>
      )}
    </div>
  );
}

function NewCategory({ onCreated }: { onCreated: (id: Id<"categories">) => void }) {
  const create = useMutation(api.catalog.createCategory);
  const run = useRun();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>("generic");
  const [color, setColor] = useState("#2A9D8F");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    let id: Id<"categories"> | undefined;
    if (await run(async () => (id = await create({ name, icon, color })))) {
      setName("");
      if (id) onCreated(id);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-3xl bg-white p-4 ring-1 ring-line">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted">New category</h2>
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Wraps" required />
      </Field>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Icon">
          <IconSelect value={icon} onChange={setIcon} />
        </Field>
        <Field label="Colour">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-[38px] w-14 cursor-pointer rounded-xl border border-line" />
        </Field>
      </div>
      <Button type="submit" busy={busy} disabled={!name.trim()} className="w-full">
        <Plus className="size-4" aria-hidden /> Add category
      </Button>
      <p className="text-xs text-muted">A new category gets a hero slide too, switched off until it has its pictures.</p>
    </form>
  );
}

function IconSelect({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {CATEGORY_ICONS.map((icon) => (
        <option key={icon} value={icon}>
          {icon}
        </option>
      ))}
    </select>
  );
}

function CategoryPanel({ category }: { category: Category }) {
  const update = useMutation(api.catalog.updateCategory);
  const move = useMutation(api.catalog.moveCategory);
  const run = useRun();
  const toast = useToast();
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (await run(() => update({ categoryId: category._id, name }))) toast({ tone: "info", title: "Category renamed" });
    setBusy(false);
  }

  return (
    <section className="space-y-4" aria-label={`${category.name} category`}>
      <div className="flex flex-wrap items-end gap-4 rounded-3xl bg-white p-5 ring-1 ring-line">
        <form onSubmit={saveName} className="flex min-w-60 flex-1 items-end gap-2">
          <Field label="Category name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Button type="submit" tone="light" busy={busy} disabled={name.trim() === category.name}>
            Save
          </Button>
        </form>
        <Field label="Icon">
          <IconSelect value={category.icon} onChange={(icon) => run(() => update({ categoryId: category._id, icon }))} />
        </Field>
        <Field label="Colour">
          <ColorInput
            key={category.color}
            label={`${category.name} colour`}
            value={category.color}
            onCommit={(color) => run(() => update({ categoryId: category._id, color }))}
          />
        </Field>
        <Toggle checked={category.enabled} onChange={(enabled) => run(() => update({ categoryId: category._id, enabled }))} label="Shown on site" />
        <MoveButtons name={category.name} onMove={(direction) => run(() => move({ categoryId: category._id, direction }))} />
      </div>

      <ul className="space-y-3">
        {category.items.map((item) => (
          <li key={item._id}>
            <ItemRow item={item} />
          </li>
        ))}
      </ul>
      {category.items.length === 0 && (
        <p className="rounded-3xl border border-dashed border-line p-8 text-center text-sm text-muted">No items in {category.name} yet.</p>
      )}
      <NewItem categoryId={category._id} />
    </section>
  );
}

function priceSummary(item: Item) {
  return item.sizes.map((s) => (item.sizes.length > 1 ? `${s.label} ${kes(s.price)}` : kes(s.price))).join(" · ");
}

function ItemRow({ item }: { item: Item }) {
  const update = useMutation(api.catalog.updateItem);
  const move = useMutation(api.catalog.moveItem);
  const run = useRun();
  const [open, setOpen] = useState(false);

  return (
    <article className={`rounded-3xl bg-white ring-1 ring-line ${item.enabled ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-center gap-3 p-3">
        <div className="size-14 shrink-0 overflow-hidden rounded-2xl bg-cream">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
          {item.imageUrl && <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-40 flex-1">
          <p className="font-bold">
            {item.name}
            {item.soldOut && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[10px] uppercase text-white">Sold out</span>}
            {!item.enabled && <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[10px] uppercase text-muted">Hidden</span>}
          </p>
          <p className="text-sm text-muted">{priceSummary(item)}</p>
        </div>
        <Toggle checked={item.soldOut} onChange={(soldOut) => run(() => update({ itemId: item._id, soldOut }))} label="Sold out" />
        <Toggle checked={item.enabled} onChange={(enabled) => run(() => update({ itemId: item._id, enabled }))} label="Shown" />
        <MoveButtons name={item.name} onMove={(direction) => run(() => move({ itemId: item._id, direction }))} />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold hover:bg-black/5"
        >
          Edit <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>
      {open && <ItemEditor item={item} onDone={() => setOpen(false)} />}
    </article>
  );
}

function SizesEditor({ sizes, onChange }: { sizes: SizeDraft[]; onChange: (sizes: SizeDraft[]) => void }) {
  return (
    <fieldset>
      <legend className="text-xs font-bold uppercase tracking-wider text-muted">Sizes and prices (KES)</legend>
      <div className="mt-1 space-y-2">
        {sizes.map((size, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={size.label}
              onChange={(e) => onChange(sizes.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)))}
              className={inputClass}
              aria-label={`Size ${i + 1} name`}
              placeholder="Regular"
            />
            <input
              value={size.price}
              inputMode="numeric"
              onChange={(e) => onChange(sizes.map((s, j) => (j === i ? { ...s, price: e.target.value.replace(/\D/g, "") } : s)))}
              className={`${inputClass} w-32`}
              aria-label={`Size ${i + 1} price in KES`}
              placeholder="950"
            />
            <button
              type="button"
              onClick={() => onChange(sizes.filter((_, j) => j !== i))}
              disabled={sizes.length === 1}
              aria-label={`Remove size ${i + 1}`}
              className="grid size-9 shrink-0 place-items-center rounded-xl hover:bg-black/5 disabled:opacity-30"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
      {sizes.length < MAX_SIZES && (
        <button type="button" onClick={() => onChange([...sizes, { label: "", price: "" }])} className="mt-2 text-sm font-bold text-brand hover:underline">
          + Add a size
        </button>
      )}
    </fieldset>
  );
}

const toSizes = (drafts: SizeDraft[]) => drafts.map((s) => ({ label: s.label, price: Number(s.price) }));

function ItemEditor({ item, onDone }: { item: Item; onDone: () => void }) {
  const update = useMutation(api.catalog.updateItem);
  const setImage = useMutation(api.catalog.setItemImage);
  const remove = useMutation(api.catalog.deleteItem);
  const run = useRun();
  const toast = useToast();
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [sizes, setSizes] = useState<SizeDraft[]>(item.sizes.map((s) => ({ label: s.label, price: String(s.price) })));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (await run(() => update({ itemId: item._id, name, description, sizes: toSizes(sizes) }))) {
      toast({ tone: "info", title: `${name.trim()} saved` });
      onDone();
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="grid gap-5 border-t border-line p-5 md:grid-cols-[200px_1fr]">
      <ImageField
        label={`${item.name} photo`}
        url={item.imageUrl}
        onUploaded={(storageId) => setImage({ itemId: item._id, storageId })}
        onRemove={() => run(() => setImage({ itemId: item._id, storageId: null }))}
      />
      <div className="space-y-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
        </Field>
        <SizesEditor sizes={sizes} onChange={setSizes} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" busy={busy}>
            Save changes
          </Button>
          <Button tone="light" onClick={onDone}>
            Close
          </Button>
          <Button tone="light" onClick={() => setConfirmDelete(true)} className="ml-auto !text-brand-dark">
            <Trash2 className="size-4" aria-hidden /> Delete item
          </Button>
        </div>
      </div>
      {confirmDelete && (
        <Confirm
          title={`Delete ${item.name}?`}
          body="It disappears from the menu and its photo is deleted. Past orders keep their own record of it. To hide it for a while instead, switch off “Shown”."
          confirm="Delete"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            void run(() => remove({ itemId: item._id }));
          }}
        />
      )}
    </form>
  );
}

function NewItem({ categoryId }: { categoryId: Id<"categories"> }) {
  const create = useMutation(api.catalog.createItem);
  const run = useRun();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sizes, setSizes] = useState<SizeDraft[]>([{ label: "Regular", price: "" }]);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Button tone="light" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> Add an item
      </Button>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (await run(() => create({ categoryId, name, description, sizes: toSizes(sizes) }))) {
      setName("");
      setDescription("");
      setSizes([{ label: "Regular", price: "" }]);
      setOpen(false);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-line">
      <h3 className="font-bold">New item</h3>
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
      </Field>
      <SizesEditor sizes={sizes} onChange={setSizes} />
      <p className="text-xs text-muted">Add the photo after saving, from the item&apos;s Edit panel.</p>
      <div className="flex gap-2">
        <Button type="submit" busy={busy}>
          Add item
        </Button>
        <Button tone="light" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
