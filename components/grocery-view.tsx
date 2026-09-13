"use client";

import { groceryToText } from "@/lib/grocery";
import { useCookbookStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function GroceryView() {
  const weeks = useCookbookStore((s) => s.weeks);
  const pantry = useCookbookStore((s) => s.pantry);
  const setGrocery = useCookbookStore((s) => s.setGrocery);
  const togglePantry = useCookbookStore((s) => s.togglePantry);
  const current = weeks[weeks.length - 1];

  if (!current) {
    return <p className="text-muted-foreground">Write a week first and the list will appear here.</p>;
  }

  const text = groceryToText(current.groceryList);

  async function copyText() {
    await navigator.clipboard.writeText(text);
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Grocery list", text });
        return;
      } catch {
        /* cancelled or unsupported */
      }
    }
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl tracking-display">Grocery</h1>
        <p className="text-muted-foreground">
          Week {current.number}. Check things off; “I have this” remembers for next week.
        </p>
      </header>
      <div className="flex gap-2">
        <Button size="touch" variant="outline" onClick={() => void copyText()}>
          Copy as text
        </Button>
        <Button size="touch" onClick={() => void share()}>
          Share
        </Button>
      </div>
      {current.groceryList.map((section) => (
        <section key={section.section} className="flex flex-col gap-3">
          <h2 className="font-display text-2xl">{section.section}</h2>
          <ul className="divide-y divide-border">
            {section.items.map((item) => {
              const inPantry = pantry.some((name) => name.toLowerCase() === item.name.toLowerCase());
              return (
                <li key={`${item.name}-${item.unit}`} className="flex items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={item.checked}
                    onChange={() => {
                      const groceryList = current.groceryList.map((group) => ({
                        ...group,
                        items: group.items.map((entry) =>
                          entry.name === item.name && entry.unit === item.unit
                            ? { ...entry, checked: !entry.checked }
                            : entry,
                        ),
                      }));
                      void setGrocery(current.id, groceryList);
                    }}
                  />
                  <span className={`flex-1 ${item.checked ? "text-muted-foreground line-through" : ""}`}>
                    {item.amount} {item.unit} {item.name}
                  </span>
                  <button
                    type="button"
                    className="h-11 text-sm text-primary"
                    onClick={() => {
                      void togglePantry(item.name);
                      const groceryList = current.groceryList.map((group) => ({
                        ...group,
                        items: group.items.map((entry) =>
                          entry.name === item.name && entry.unit === item.unit
                            ? { ...entry, inPantry: !inPantry, checked: !inPantry ? true : entry.checked }
                            : entry,
                        ),
                      }));
                      void setGrocery(current.id, groceryList);
                    }}
                  >
                    {inPantry ? "In pantry" : "I have this"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
