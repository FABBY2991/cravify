"use client";

import { useMutation } from "convex/react";
import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { messageOf } from "@/lib/errors";
import { ACCEPT, type UploadKind, uploadFile } from "@/lib/upload";

type Toast = { id: number; tone: "info" | "error" | "order"; title: string; body?: string };
const ToastContext = createContext<(toast: Omit<Toast, "id">) => void>(() => {});

export function Toasts({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++counter.current;
    setToasts((all) => [...all.slice(-3), { ...toast, id }]);
    setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), toast.tone === "order" ? 8000 : 5000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className={`pointer-events-auto rounded-2xl p-4 shadow-xl ring-1 ${
                t.tone === "error"
                  ? "bg-white text-brand-dark ring-brand/30"
                  : t.tone === "order"
                    ? "bg-ink text-white ring-black"
                    : "bg-white text-ink ring-line"
              }`}
              role={t.tone === "error" ? "alert" : "status"}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-sm opacity-80">{t.body}</p>}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/** Runs a mutation and reports a failure as a toast. Returns whether it worked. */
export function useRun() {
  const toast = useToast();
  return useCallback(
    async (work: () => Promise<unknown>) => {
      try {
        await work();
        return true;
      } catch (error) {
        toast({ tone: "error", title: "That didn't work", body: messageOf(error) });
        return false;
      }
    },
    [toast],
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm font-semibold ${disabled ? "opacity-50" : ""}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-ink" : "bg-black/15"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
      {label}
    </label>
  );
}

export function MoveButtons({ onMove, name }: { onMove: (direction: "up" | "down") => void; name: string }) {
  return (
    <span className="inline-flex">
      <button type="button" onClick={() => onMove("up")} aria-label={`Move ${name} up`} className="grid size-8 place-items-center rounded-lg hover:bg-black/5">
        <ArrowUp className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={() => onMove("down")} aria-label={`Move ${name} down`} className="grid size-8 place-items-center rounded-lg hover:bg-black/5">
        <ArrowDown className="size-4" aria-hidden />
      </button>
    </span>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-ink disabled:opacity-60";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Button({
  children,
  tone = "dark",
  busy,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "dark" | "light" | "danger"; busy?: boolean }) {
  const tones = {
    dark: "bg-ink text-white hover:bg-brand",
    light: "bg-white text-ink ring-1 ring-line hover:bg-cream",
    danger: "bg-brand text-white hover:bg-brand-dark",
  };
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${tones[tone]} ${className}`}
    >
      {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Confirm({
  title,
  body,
  confirm,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirm: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/50 p-4" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-bold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button tone="light" onClick={onCancel} autoFocus>
            Keep it
          </Button>
          <Button tone="danger" onClick={onConfirm}>
            {confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Shows an image (or video) slot with Upload / Replace / Remove. `onUploaded`
 * hands the new storage id to the right mutation, which returns null or why
 * it refused.
 */
export function ImageField({
  url,
  label,
  onUploaded,
  onRemove,
  square,
  kind = "image",
}: {
  url: string | null;
  label: string;
  onUploaded: (storageId: Id<"_storage">) => Promise<string | null>;
  onRemove?: () => Promise<unknown>;
  square?: boolean;
  kind?: UploadKind;
}) {
  const generateUploadUrl = useMutation(api.catalog.generateUploadUrl);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const storageId = await uploadFile(file, kind, () => generateUploadUrl());
      const refused = await onUploaded(storageId);
      if (refused) setError(refused);
    } catch (err) {
      setError(err instanceof Error && !("data" in err) ? err.message : messageOf(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <div className={`relative overflow-hidden rounded-2xl bg-[repeating-conic-gradient(#f3e9de_0_25%,#fffaf4_0_50%)] bg-[length:16px_16px] ring-1 ring-line ${square ? "aspect-square" : "aspect-[4/3]"}`}>
        {url && kind === "video" ? (
          <video src={url} muted loop autoPlay playsInline className="h-full w-full object-contain" aria-label={label} />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file
          <img src={url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <div className="grid h-full place-items-center text-xs font-semibold text-muted">
            No {kind === "video" ? "video" : "image"} yet
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <LoaderCircle className="size-6 animate-spin" aria-label="Uploading" />
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept={ACCEPT[kind]}
          className="sr-only"
          aria-label={`Upload ${label}`}
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <Button tone="light" onClick={() => input.current?.click()} busy={busy} className="!px-3 !py-1.5 text-xs">
          <ImagePlus className="size-3.5" aria-hidden /> {url ? "Replace" : "Upload"}
        </Button>
        {url && onRemove && (
          <Button tone="light" onClick={() => onRemove()} className="!px-3 !py-1.5 text-xs">
            <Trash2 className="size-3.5" aria-hidden /> Remove
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs font-semibold text-brand-dark">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * A colour picker that saves once the colour settles, not on every step of
 * a drag. Key it by the saved value so outside changes reset it.
 */
export function ColorInput({ value, onCommit, label }: { value: string; onCommit: (color: string) => void; label: string }) {
  const [draft, setDraft] = useState(value.toLowerCase());
  const committed = useRef(value.toLowerCase());
  useEffect(() => {
    if (draft === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = draft;
      onCommit(draft);
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, onCommit]);
  return (
    <input
      type="color"
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      className="h-[38px] w-14 cursor-pointer rounded-xl border border-line"
    />
  );
}
