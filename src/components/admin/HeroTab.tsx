"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Play, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CREDIT_MAX, HEADLINE_MAX, KICKER_MAX, MAX_PIECES } from "../../../convex/lib/limits";
import { SlideArt } from "@/components/site/SlideArt";
import { Button, ColorInput, Field, ImageField, inputClass, MoveButtons, Toggle, useRun, useToast } from "./ui";

type Catalog = FunctionReturnType<typeof api.catalog.adminCatalog>;
type Slide = Catalog["slides"][number];
type Category = Catalog["categories"][number];

export function HeroTab() {
  const catalog = useQuery(api.catalog.adminCatalog);
  if (catalog === undefined) return <div className="shimmer h-96 rounded-3xl" />;
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted">
        Each category has one full-screen slide. The food cut-out should be a PNG or WebP with a transparent
        background so it can sit in front of the headline; floating pieces work the same way. Changes go live on
        the site as soon as they save.
      </p>
      {catalog.slides.map((slide) => {
        const category = catalog.categories.find((c) => c._id === slide.categoryId);
        return category ? <SlideEditor key={slide._id} slide={slide} category={category} /> : null;
      })}
    </div>
  );
}

function SlideEditor({ slide, category }: { slide: Slide; category: Category }) {
  const update = useMutation(api.hero.updateSlide);
  const move = useMutation(api.hero.moveSlide);
  const setHeroImage = useMutation(api.hero.setHeroImage);
  const setHeroVideo = useMutation(api.hero.setHeroVideo);
  const addPiece = useMutation(api.hero.addPiece);
  const removePiece = useMutation(api.hero.removePiece);
  const updateCategory = useMutation(api.catalog.updateCategory);
  const run = useRun();
  const toast = useToast();
  const [headline, setHeadline] = useState(slide.headline);
  const [kicker, setKicker] = useState(slide.kicker);
  const [credit, setCredit] = useState(slide.credit ?? "");
  const [busy, setBusy] = useState(false);
  const [replay, setReplay] = useState(0);

  const dirty = headline !== slide.headline || kicker !== slide.kicker || credit !== (slide.credit ?? "");
  const preview = {
    color: category.color,
    headline: (headline || slide.headline).replace(/\s/g, "").toUpperCase(),
    kicker,
    icon: category.icon,
    heroImageUrl: slide.heroImageUrl,
    heroVideoUrl: slide.heroVideoUrl,
    pieceUrls: slide.pieces.flatMap((p) => (p.url ? [p.url] : [])),
    credit,
  };

  async function saveText(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (await run(() => update({ slideId: slide._id, headline, kicker, credit }))) {
      toast({ tone: "info", title: `${category.name} slide saved` });
    }
    setBusy(false);
  }

  return (
    <article className={`overflow-hidden rounded-3xl bg-white ring-1 ring-line ${slide.enabled ? "" : "opacity-80"}`} aria-label={`${category.name} slide`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <h2 className="font-display text-2xl uppercase">{category.name}</h2>
        {!category.enabled && <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs text-muted">Category hidden — slide won&apos;t show</span>}
        <div className="ml-auto flex items-center gap-3">
          <Toggle checked={slide.enabled} onChange={(enabled) => run(() => update({ slideId: slide._id, enabled }))} label="Shown in hero" />
          <MoveButtons name={`${category.name} slide`} onMove={(direction) => run(() => move({ slideId: slide._id, direction }))} />
        </div>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-2xl ring-1 ring-line">
            <SlideArt key={replay} slide={preview} phase={replay ? "first" : "still"} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>Preview (desktop shape)</span>
            <button type="button" onClick={() => setReplay((r) => r + 1)} className="inline-flex items-center gap-1 font-bold text-ink hover:text-brand">
              <Play className="size-3.5" aria-hidden /> Play entrance
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <form onSubmit={saveText} className="space-y-3">
            <Field label="Headline" hint={`One word, up to ${HEADLINE_MAX} letters — shown in capitals behind the food.`}>
              <input value={headline} maxLength={HEADLINE_MAX} onChange={(e) => setHeadline(e.target.value)} className={`${inputClass} font-display text-lg uppercase`} />
            </Field>
            <Field label="Line above the headline">
              <input value={kicker} maxLength={KICKER_MAX} onChange={(e) => setKicker(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Credit (optional)" hint="Shown small on the slide — credit anyone whose image or clip you use.">
              <input value={credit} maxLength={CREDIT_MAX} onChange={(e) => setCredit(e.target.value)} className={inputClass} placeholder="Photo: @creator" />
            </Field>
            <Button type="submit" busy={busy} disabled={!dirty}>
              Save text
            </Button>
          </form>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Slide colour" hint="Also the category's menu colour.">
              <ColorInput
                key={category.color}
                label={`${category.name} slide colour`}
                value={category.color}
                onCommit={(color) => run(() => updateCategory({ categoryId: category._id, color }))}
              />
            </Field>
            <Field label="Product on the card">
              <select
                value={slide.featuredItemId ?? ""}
                onChange={(e) =>
                  run(() =>
                    update({
                      slideId: slide._id,
                      featuredItemId: e.target.value ? (e.target.value as Slide["featuredItemId"] & string) : null,
                    }),
                  )
                }
                className={inputClass}
              >
                <option value="">No product card</option>
                {category.items.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                    {!item.enabled ? " (hidden)" : item.soldOut ? " (sold out)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-[150px_150px_1fr]">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Food cut-out</p>
              <ImageField
                square
                label={`${category.name} hero image`}
                url={slide.heroImageUrl}
                onUploaded={(storageId) => setHeroImage({ slideId: slide._id, storageId })}
                onRemove={() => run(() => setHeroImage({ slideId: slide._id, storageId: null }))}
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Clip (optional)</p>
              <ImageField
                square
                kind="video"
                label={`${category.name} hero clip`}
                url={slide.heroVideoUrl}
                onUploaded={(storageId) => setHeroVideo({ slideId: slide._id, storageId })}
                onRemove={() => run(() => setHeroVideo({ slideId: slide._id, storageId: null }))}
              />
              <p className="mt-1 text-[11px] text-muted">Plays instead of the cut-out; the cut-out becomes its still frame.</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">
                Floating pieces ({slide.pieces.length}/{MAX_PIECES})
              </p>
              <ul className="grid grid-cols-4 gap-2">
                {slide.pieces.map((piece, i) => (
                  <li key={piece.id} className="relative aspect-square overflow-hidden rounded-xl bg-cream ring-1 ring-line">
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
                    {piece.url && <img src={piece.url} alt={`Piece ${i + 1}`} className="h-full w-full object-contain" />}
                    <button
                      type="button"
                      onClick={() => run(() => removePiece({ slideId: slide._id, storageId: piece.id }))}
                      aria-label={`Remove piece ${i + 1}`}
                      className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-white/90 shadow"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              {slide.pieces.length < MAX_PIECES && (
                <div className="mt-2 max-w-[160px]">
                  <ImageField square label={`a new ${category.name} piece`} url={null} onUploaded={(storageId) => addPiece({ slideId: slide._id, storageId })} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
