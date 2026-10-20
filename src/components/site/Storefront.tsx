"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CartDrawer } from "./CartDrawer";
import { CartProvider } from "./CartProvider";
import { Hero, HeroSkeleton } from "./Hero";
import { About, Contact, Footer } from "./InfoSections";
import { MenuSection, MenuSkeleton } from "./MenuSection";
import { Nav } from "./Nav";

export function Storefront() {
  const data = useQuery(api.menu.storefront);
  const [heroColor, setHeroColor] = useState("#F7931E");

  if (data === undefined) {
    return (
      <main>
        <HeroSkeleton />
        <MenuSkeleton />
      </main>
    );
  }

  return (
    <CartProvider>
      <Nav heroColor={heroColor} categories={data.categories} settings={data.settings} />
      <main>
        <Hero slides={data.slides} onColor={setHeroColor} />
        <MenuSection categories={data.categories} />
        <About />
        <Contact settings={data.settings} />
      </main>
      <Footer settings={data.settings} />
      <CartDrawer data={data} />
    </CartProvider>
  );
}
