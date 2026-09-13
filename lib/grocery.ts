import type { Ingredient, Recipe } from "@/lib/schemas";
import { GrocerySectionSchema } from "@/lib/schemas";
import type { z } from "zod";

export type GrocerySection = z.infer<typeof GrocerySectionSchema>;

const SECTIONS = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Frozen",
  "Spices",
  "Pantry",
  "Other",
] as const;

const SECTION_KEYWORDS: Record<(typeof SECTIONS)[number], string[]> = {
  Produce: [
    "tomato",
    "onion",
    "garlic",
    "lemon",
    "lime",
    "spinach",
    "kale",
    "lettuce",
    "herb",
    "basil",
    "cilantro",
    "parsley",
    "pepper",
    "carrot",
    "broccoli",
    "apple",
    "banana",
    "berry",
    "avocado",
    "cucumber",
    "zucchini",
    "potato",
    "ginger",
    "scallion",
    "cabbage",
    "mushroom",
    "fennel",
    "pear",
    "orange",
    "shallot",
  ],
  "Meat & Seafood": [
    "chicken",
    "beef",
    "pork",
    "turkey",
    "lamb",
    "salmon",
    "tuna",
    "shrimp",
    "cod",
    "fish",
    "steak",
    "bacon",
    "sausage",
  ],
  "Dairy & Eggs": [
    "milk",
    "yogurt",
    "cheese",
    "butter",
    "cream",
    "egg",
    "ricotta",
    "parmesan",
    "feta",
    "cottage",
  ],
  Bakery: ["bread", "tortilla", "bun", "pita", "bagel", "roll"],
  Frozen: ["frozen", "ice"],
  Spices: [
    "cumin",
    "paprika",
    "cinnamon",
    "turmeric",
    "chili",
    "oregano",
    "thyme",
    "salt",
    "peppercorn",
    "spice",
  ],
  Pantry: [
    "oil",
    "rice",
    "pasta",
    "farro",
    "bean",
    "lentil",
    "chickpea",
    "flour",
    "sugar",
    "vinegar",
    "soy",
    "oat",
    "nut",
    "almond",
    "can",
    "stock",
    "broth",
    "honey",
    "mustard",
  ],
  Other: [],
};

function sectionFor(name: string): (typeof SECTIONS)[number] {
  const n = name.toLowerCase();
  for (const section of SECTIONS) {
    if (section === "Other") continue;
    if (SECTION_KEYWORDS[section].some((word) => n.includes(word))) return section;
  }
  return "Other";
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeUnit(unit: string): string {
  const u = unit.trim().toLowerCase().replace(/\.$/, "");
  if (u === "teaspoon" || u === "teaspoons") return "tsp";
  if (u === "tablespoon" || u === "tablespoons") return "tbsp";
  if (u === "grams" || u === "gram") return "g";
  if (u === "ounces" || u === "ounce") return "oz";
  return u;
}

const TO_TSP: Record<string, number> = { tsp: 1, tbsp: 3, cup: 48 };

function mergeKey(name: string, unit: string): { key: string; amount: number; unit: string } {
  const n = normalizeName(name);
  const u = normalizeUnit(unit);
  if (TO_TSP[u] !== undefined) {
    return { key: `${n}|volume`, amount: TO_TSP[u], unit: "tsp" };
  }
  return { key: `${n}|${u}`, amount: 1, unit: u };
}

function displayAmount(amount: number, unit: string): { amount: number; unit: string } {
  if (unit !== "tsp") return { amount: Math.round(amount * 100) / 100, unit };
  if (amount >= 48 && Math.abs(amount / 48 - Math.round(amount / 48)) < 0.05) {
    return { amount: Math.round(amount / 48), unit: "cup" };
  }
  if (amount >= 3) {
    return { amount: Math.round((amount / 3) * 100) / 100, unit: "tbsp" };
  }
  return { amount: Math.round(amount * 100) / 100, unit: "tsp" };
}

export function buildGroceryList(
  recipes: Recipe[],
  pantryNames: string[] = [],
): GrocerySection[] {
  const pantry = new Set(pantryNames.map(normalizeName));
  const merged = new Map<string, { name: string; amount: number; unit: string }>();

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const { key, amount: factor, unit } = mergeKey(ingredient.name, ingredient.unit);
      const existing = merged.get(key);
      const add = ingredient.amount * factor;
      if (existing) {
        existing.amount += add;
      } else {
        merged.set(key, { name: ingredient.name, amount: add, unit });
      }
    }
  }

  const buckets = new Map<(typeof SECTIONS)[number], GrocerySection["items"]>();
  for (const section of SECTIONS) buckets.set(section, []);

  for (const item of merged.values()) {
    const inPantry = pantry.has(normalizeName(item.name));
    const shown = displayAmount(item.amount, item.unit);
    buckets.get(sectionFor(item.name))?.push({
      name: item.name,
      amount: shown.amount,
      unit: shown.unit,
      checked: inPantry,
      inPantry,
    });
  }

  return SECTIONS.map((section) => ({
    section,
    items: buckets.get(section) ?? [],
  })).filter((section) => section.items.length > 0);
}

export function groceryToText(sections: GrocerySection[]): string {
  return sections
    .map((section) => {
      const lines = section.items
        .filter((item) => !item.inPantry)
        .map((item) => `- ${item.amount} ${item.unit} ${item.name}`);
      if (lines.length === 0) return "";
      return `${section.section}\n${lines.join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function uniqueIngredients(recipes: Recipe[]): Ingredient[] {
  const names = new Set<string>();
  const result: Ingredient[] = [];
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const key = normalizeName(ingredient.name);
      if (names.has(key)) continue;
      names.add(key);
      result.push(ingredient);
    }
  }
  return result;
}
