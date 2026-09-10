"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-base text-foreground transition-colors duration-hover ease-standard hover:bg-muted"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to espresso dark mode"}
    >
      {isDark ? (
        <Sun className="size-5" strokeWidth={1.5} />
      ) : (
        <Moon className="size-5" strokeWidth={1.5} />
      )}
      <span className="hidden sm:inline">{isDark ? "Daylight" : "Evening"}</span>
    </button>
  );
}
