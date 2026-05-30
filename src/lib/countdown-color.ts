/**
 * Returns [r, g, b] for countdown ring/chip color.
 * Amber above 50%, then smoothly blends to red from 50% → 0%.
 */
export function getCountdownRgb(pct: number): [number, number, number] {
  if (pct >= 0.5) return [212, 160, 23]; // amber
  const t = (0.5 - pct) / 0.5; // 0 at 50%, 1 at 0%
  return [
    Math.round(212 + (224 - 212) * t), // 212 → 224
    Math.round(160 + (32 - 160) * t), // 160 → 32
    Math.round(23 + (32 - 23) * t), // 23 → 32
  ];
}
