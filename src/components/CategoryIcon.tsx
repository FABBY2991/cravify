import {
  CupSoda,
  Drumstick,
  GlassWater,
  Hamburger,
  IceCreamCone,
  type LucideProps,
  Pizza,
  Popcorn,
  Utensils,
} from "lucide-react";

const ICONS = {
  burger: Hamburger,
  pizza: Pizza,
  chicken: Drumstick,
  shake: CupSoda,
  dessert: IceCreamCone,
  fries: Popcorn,
  drink: GlassWater,
  generic: Utensils,
};

export function CategoryIcon({ icon, ...props }: { icon: string } & LucideProps) {
  const Icon = ICONS[icon as keyof typeof ICONS] ?? Utensils;
  return <Icon aria-hidden {...props} />;
}
