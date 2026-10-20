"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { parseNumberField } from "@/lib/display";

type NumberFieldProps = Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number;
  onValueChange: (value: number | null) => void;
  integer?: boolean;
  allowZero?: boolean;
};

function formatNumber(value: number, integer: boolean, allowZero: boolean): string {
  if (!Number.isFinite(value)) return "";
  if (value === 0 && !allowZero) return "";
  if (integer) return String(Math.round(value));
  return String(value);
}

function isAllowedNumberText(raw: string, integer: boolean): boolean {
  if (raw === "") return true;
  if (integer) return /^\d*$/.test(raw);
  return /^\d*\.?\d*$/.test(raw);
}

export function NumberField({
  value,
  onValueChange,
  integer = false,
  allowZero = false,
  ...props
}: NumberFieldProps) {
  const formatted = formatNumber(value, integer, allowZero);
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? formatted;

  function commit(raw: string) {
    const parsed = parseNumberField(raw);
    if (parsed === null || (parsed === 0 && !allowZero)) {
      onValueChange(null);
      return;
    }
    onValueChange(integer ? Math.round(parsed) : parsed);
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      autoComplete="off"
      value={display}
      onFocus={() => setDraft(formatted)}
      onBlur={() => setDraft(null)}
      onChange={(event) => {
        const raw = event.target.value;
        if (!isAllowedNumberText(raw, integer)) return;
        setDraft(raw);
        commit(raw);
      }}
    />
  );
}
