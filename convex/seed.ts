import { internalMutation } from "./_generated/server";
import { seedSampleOrders } from "./demo";
import { DEFAULT_SETTINGS } from "./lib/settings";
import { slugify } from "./lib/text";

type SeedItem = { name: string; description: string; sizes: [label: string, price: number][] };

/** The starting menu. Sample prices in KES — editable in the admin. */
const MENU: {
  name: string;
  icon: string;
  color: string;
  headline: string;
  kicker: string;
  credit?: string;
  items: SeedItem[];
}[] = [
  {
    name: "Burgers",
    icon: "burger",
    // Near-black, so the burger clip's own black background melts into the slide.
    color: "#0E0A08",
    headline: "BURGERLICIOUS",
    kicker: "The triple bacon stack",
    credit: "Burger animation: @valeriia.larkina.ai",
    items: [
      { name: "Triple Bacon Stack", description: "Three beef patties, crispy bacon, cheddar and Swiss, lettuce, tomato and house sauce. Served with seasoned fries.", sizes: [["Regular", 1450]] },
      { name: "Double Smash Burger", description: "Two smashed beef patties, melted cheddar, pickles and house sauce on a toasted brioche bun.", sizes: [["Regular", 950]] },
      { name: "Classic Cheeseburger", description: "Flame-grilled beef, cheddar, lettuce, tomato and ketchup.", sizes: [["Regular", 650]] },
      { name: "Crispy Chicken Burger", description: "Buttermilk-fried chicken thigh, slaw and chilli mayo.", sizes: [["Regular", 750]] },
      { name: "Veggie Bean Burger", description: "Spiced bean patty, avocado, pickled onion and herb mayo.", sizes: [["Regular", 700]] },
    ],
  },
  {
    name: "Pizza",
    icon: "pizza",
    color: "#E23D28",
    headline: "PIZZAHOLIC",
    kicker: "Pepperoni, fresh from the oven",
    items: [
      { name: "Pepperoni", description: "Loaded pepperoni, stretchy mozzarella, cherry tomatoes and fresh basil.", sizes: [["Small", 900], ["Large", 1600]] },
      { name: "Margherita", description: "Tomato, fresh mozzarella and basil. Simple and perfect.", sizes: [["Small", 750], ["Large", 1350]] },
      { name: "BBQ Chicken", description: "Grilled chicken, red onion, peppers and smoky BBQ base.", sizes: [["Small", 950], ["Large", 1700]] },
      { name: "Hawaiian", description: "Ham, pineapple and mozzarella — yes, it belongs.", sizes: [["Small", 900], ["Large", 1600]] },
      { name: "Meat Feast", description: "Beef, sausage, pepperoni and bacon on one pizza.", sizes: [["Small", 1100], ["Large", 1950]] },
    ],
  },
  {
    name: "Fried chicken",
    icon: "chicken",
    color: "#F5B700",
    headline: "CRUNCHTASTIC",
    kicker: "The drumstick platter",
    items: [
      { name: "Drumstick Platter", description: "Double-dipped crispy drumsticks with seasoned fries and a garlic-herb dip.", sizes: [["6 pieces", 1350], ["10 pieces", 2050]] },
      { name: "3-Piece Meal", description: "Three crispy pieces with fries and a dip.", sizes: [["Regular", 850]] },
      { name: "Hot Wings", description: "Wings tossed in our house hot sauce.", sizes: [["6 wings", 650], ["12 wings", 1200]] },
      { name: "Chicken Strips", description: "Five tender strips with honey-mustard dip.", sizes: [["Regular", 700]] },
      { name: "Seasoned Fries", description: "Crispy fries with our secret seasoning.", sizes: [["Regular", 250], ["Large", 350]] },
    ],
  },
  {
    name: "Shakes & Drinks",
    icon: "shake",
    color: "#F39BB3",
    headline: "BERRYLICIOUS",
    kicker: "Berries & cream freakshake",
    items: [
      { name: "Berries & Cream Freakshake", description: "Strawberry shake, berry drizzle, whipped cream, fresh berries and a slice of cake on top.", sizes: [["Small", 550], ["Large", 750]] },
      { name: "Blueberry Shake", description: "Blueberry ice cream, compote swirl and whipped cream.", sizes: [["Small", 500], ["Large", 700]] },
      { name: "Mango Chia Smoothie", description: "Ripe mango blended smooth, with chia seeds and fresh fruit.", sizes: [["Small", 450], ["Large", 650]] },
      { name: "Chocolate Shake", description: "Rich chocolate ice cream with a fudge swirl.", sizes: [["Small", 450], ["Large", 650]] },
      { name: "Blackberry Mint Fizz", description: "Blackberries, lime and mint over ice with sparkling soda. Alcohol-free.", sizes: [["Regular", 350]] },
      { name: "Blue Lagoon Lemonade", description: "Sparkling blue lemonade with lemon slices and blueberries. Alcohol-free.", sizes: [["Regular", 350]] },
    ],
  },
  {
    name: "Desserts",
    icon: "dessert",
    color: "#7FD1C2",
    headline: "SCOOPTACULAR",
    kicker: "The triple scoop sundae",
    items: [
      { name: "Triple Scoop Sundae", description: "Chocolate, vanilla and strawberry scoops with brownie bites, caramel, nuts and a waffle crisp.", sizes: [["Regular", 650]] },
      { name: "Berry Granola Parfait", description: "Layers of yoghurt, berry compote, granola, banana and fresh berries.", sizes: [["Regular", 450]] },
      { name: "Orange Sherbet", description: "Light, zesty orange sherbet.", sizes: [["2 scoops", 350], ["3 scoops", 450]] },
      { name: "Chocolate Lava Cake", description: "Warm chocolate cake with a molten centre and vanilla ice cream.", sizes: [["Regular", 550]] },
      { name: "Cheesecake Slice", description: "Creamy baked cheesecake with berry compote.", sizes: [["Regular", 500]] },
    ],
  },
];

/**
 * Lays out the starting menu, hero slides, settings and sample orders on an
 * empty deployment. Does nothing if a menu already exists, so it is safe to
 * re-run: `npx convex run seed:init`.
 */
export const init = internalMutation({
  args: {},
  handler: async (ctx) => {
    if ((await ctx.db.query("categories").first()) !== null) return "Already seeded — nothing changed.";

    for (const [i, category] of MENU.entries()) {
      const categoryId = await ctx.db.insert("categories", {
        name: category.name,
        slug: slugify(category.name),
        position: i + 1,
        enabled: true,
        icon: category.icon,
        color: category.color,
      });
      let featuredItemId;
      for (const [j, item] of category.items.entries()) {
        const itemId = await ctx.db.insert("menuItems", {
          categoryId,
          name: item.name,
          description: item.description,
          position: j + 1,
          sizes: item.sizes.map(([label, price]) => ({ key: slugify(label), label, price })),
          enabled: true,
          soldOut: false,
        });
        if (j === 0) featuredItemId = itemId;
      }
      await ctx.db.insert("heroSlides", {
        categoryId,
        position: i + 1,
        enabled: true,
        headline: category.headline,
        kicker: category.kicker,
        featuredItemId,
        pieceImageIds: [],
        credit: category.credit,
      });
    }

    if ((await ctx.db.query("settings").first()) === null) {
      await ctx.db.insert("settings", { key: "site", ...DEFAULT_SETTINGS });
    }
    const samples = await seedSampleOrders(ctx);
    return `Seeded ${MENU.length} categories, their hero slides and ${samples} sample orders.`;
  },
});
