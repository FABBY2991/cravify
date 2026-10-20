import { Clock, Flame, Leaf, MapPin, Timer } from "lucide-react";
import Link from "next/link";
import type { SiteSettings } from "@/lib/types";

const REASONS = [
  { icon: Flame, title: "Made to order", text: "Nothing waits under a heat lamp. Every burger is smashed, every pizza stretched, when you order it." },
  { icon: Timer, title: "Hot and fast", text: "Follow your order live, from the moment the kitchen gets it to the moment it's ready." },
  { icon: Leaf, title: "Proper ingredients", text: "Real fruit in the shakes, fresh dough every morning, chicken double-dipped by hand." },
];

export function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-[92px] bg-ink py-24 text-cream">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#F7931E]">Why Cravify</p>
        <h2 id="about-title" className="mt-2 max-w-3xl font-display text-6xl uppercase leading-none md:text-8xl">
          Food you think about all day
        </h2>
        <ul className="mt-14 grid gap-6 md:grid-cols-3">
          {REASONS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-3xl bg-white/5 p-7 ring-1 ring-white/10">
              <Icon className="size-8 text-[#F5B700]" aria-hidden />
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-cream/70">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Contact({ settings }: { settings: SiteSettings }) {
  return (
    <section id="contact" aria-labelledby="contact-title" className="scroll-mt-[92px] bg-[#F5B700] py-24 text-ink">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:grid-cols-2 md:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em]">Contact</p>
          <h2 id="contact-title" className="mt-2 font-display text-6xl uppercase leading-none md:text-8xl">
            Come hungry
          </h2>
          <dl className="mt-10 space-y-5 text-lg">
            <div className="flex gap-3">
              <dt>
                <Clock className="mt-1 size-5" aria-label="Opening hours" />
              </dt>
              <dd className="font-semibold">{settings.hours}</dd>
            </div>
            <div className="flex gap-3">
              <dt>
                <MapPin className="mt-1 size-5" aria-label="Location" />
              </dt>
              <dd className="font-semibold">{settings.location}</dd>
            </div>
          </dl>
          <a
            href="#menu"
            className="mt-10 inline-block rounded-full bg-ink px-8 py-4 font-bold tracking-wide text-white transition hover:bg-brand"
          >
            ORDER NOW
          </a>
        </div>
        <div className="self-end rounded-3xl bg-white/60 p-8 ring-1 ring-black/5">
          <h3 className="font-display text-3xl uppercase">About this project</h3>
          <p className="mt-3 text-ink/80">
            Cravify is a concept brand and a full-stack demo by{" "}
            {settings.creditUrl ? (
              <a href={settings.creditUrl} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-2">
                {settings.creditName}
              </a>
            ) : (
              <strong>{settings.creditName}</strong>
            )}
            : a live menu, cart and checkout, real-time order tracking and an admin dashboard, all backed by a real
            database. Orders you place appear on the admin board instantly — but no food is made, no payment is taken
            and nobody will contact you.
          </p>
          <p className="mt-3 text-sm text-ink/70">The hours, location and prices on this site are samples.</p>
        </div>
      </div>
    </section>
  );
}

export function Footer({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="bg-ink py-12 text-cream/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="font-logo text-4xl text-cream">
            Cravify<span className="text-brand">!</span>
          </p>
          <p className="mt-2 max-w-md text-sm">
            © {new Date().getFullYear()} Cravify — a concept project by {settings.creditName}. Orders are not fulfilled
            and no payment is taken. Prices are samples.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <a href="#top" className="hover:text-cream">
            Home
          </a>
          <a href="#menu" className="hover:text-cream">
            Menu
          </a>
          <a href="#about" className="hover:text-cream">
            About
          </a>
          <a href="#contact" className="hover:text-cream">
            Contact
          </a>
          <Link href="/admin" className="hover:text-cream">
            Admin
          </Link>
        </nav>
      </div>
    </footer>
  );
}
