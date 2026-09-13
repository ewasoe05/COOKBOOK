const FRACTIONS: Record<number, string> = {
  0.125: "⅛",
  0.25: "¼",
  0.333: "⅓",
  0.375: "⅜",
  0.5: "½",
  0.625: "⅝",
  0.666: "⅔",
  0.75: "¾",
  0.875: "⅞",
};

function nearestEighth(value: number): number {
  return Math.round(value * 8) / 8;
}

export function formatNumber(value: number): string {
  const rounded = nearestEighth(value);
  if (rounded === 0) {
    return nearestEighth(value * 2) === 0 ? "0" : "⅛";
  }

  const whole = Math.trunc(rounded);
  const fraction = Number((rounded - whole).toFixed(3));

  if (fraction === 0) {
    return String(whole);
  }

  const glyph = FRACTIONS[fraction] ?? FRACTIONS[Number(fraction.toFixed(3))];
  if (glyph) {
    return whole === 0 ? glyph : `${whole}${glyph}`;
  }

  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function formatQuantity(amount: number, unit: string): string {
  const n = formatNumber(amount);
  return unit ? `${n} ${unit}` : n;
}
