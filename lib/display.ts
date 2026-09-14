export function cmToImperial(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return { feet, inches };
}

export function imperialToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54);
}

export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462);
}

export function parseNumberField(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === ".") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function lbToKg(lb: number): number {
  return Math.round((lb / 2.20462) * 10) / 10;
}

export function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

export function isCookModePath(pathname: string): boolean {
  return /\/cook\/?$/.test(pathname);
}
