import {
  Car,
  Cloud,
  Heart,
  House,
  Layers,
  Music2,
  Play,
  Repeat2,
  ShoppingBag,
  ShoppingBasket,
  Utensils,
  Zap,
} from "lucide-react";
export function CategoryIcon({
  category,
  name = "",
}: {
  category: string;
  name?: string;
}) {
  const Icon = name.includes("Spotify")
    ? Music2
    : name.includes("Netflix")
      ? Play
      : name.includes("iCloud")
        ? Cloud
        : {
          Housing: House,
          Groceries: ShoppingBasket,
          Utilities: Zap,
          Health: Heart,
          Transport: Car,
          Shopping: ShoppingBag,
          "Eating out": Utensils,
          Subscriptions: Repeat2,
        }[category] || Layers;
  return (
    <span
      className={
        "category-icon cat-" + category.toLowerCase().replace(" ", "-")
      }
    >
      <Icon size={18} />
    </span>
  );
}
