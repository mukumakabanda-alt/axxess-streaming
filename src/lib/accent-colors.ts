// Accent color presets for service packages.
// `value` is what gets stored in services.accent_color.
// `hex` drives the visual rendering on the public site.
export type AccentPreset = {
  value: string;
  label: string;
  hex: string;
};

export const ACCENT_PRESETS: AccentPreset[] = [
  { value: "red", label: "Red", hex: "#FF3131" },
  { value: "spotify", label: "Spotify Green", hex: "#1DB954" },
  { value: "orange", label: "Orange", hex: "#FF7A1A" },
  { value: "amber", label: "Amber", hex: "#F5B301" },
  { value: "yellow", label: "Yellow", hex: "#FFD60A" },
  { value: "lime", label: "Lime", hex: "#A3E635" },
  { value: "emerald", label: "Emerald", hex: "#10B981" },
  { value: "teal", label: "Teal", hex: "#14B8A6" },
  { value: "cyan", label: "Cyan", hex: "#22D3EE" },
  { value: "sky", label: "Sky", hex: "#38BDF8" },
  { value: "blue", label: "Blue", hex: "#3B82F6" },
  { value: "indigo", label: "Indigo", hex: "#6366F1" },
  { value: "violet", label: "Violet", hex: "#8B5CF6" },
  { value: "purple", label: "Purple", hex: "#A855F7" },
  { value: "fuchsia", label: "Fuchsia", hex: "#D946EF" },
  { value: "pink", label: "Pink", hex: "#EC4899" },
  { value: "rose", label: "Rose", hex: "#F43F5E" },
  { value: "slate", label: "Slate", hex: "#64748B" },
];

const PRESET_MAP = new Map(ACCENT_PRESETS.map((p) => [p.value, p]));

/**
 * Resolve any stored accent_color (preset value or raw hex/css color)
 * into a usable CSS color string. Falls back to the primary red.
 */
export function resolveAccentHex(accent: string | null | undefined): string {
  if (!accent) return "#FF3131";
  const preset = PRESET_MAP.get(accent);
  if (preset) return preset.hex;
  // Allow raw hex / css colors saved from older data.
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accent)) return accent;
  return "#FF3131";
}

/** True if the accent should be treated as a "light" highlight (text on color = black). */
export function isLightAccent(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Perceived luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
}
