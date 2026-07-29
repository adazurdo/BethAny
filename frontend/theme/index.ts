export const colors = {
  background: "#050308", // true black with the faintest purple undertone
  surface: "#0E0816", // near-black panel tone
  surfaceSoft: "#16101F", // slightly lifted near-black panel
  primary: "#B026FF", // neon purple accent
  primaryDark: "#7C1FD9", // darker neon purple for pressed/contrast
  text: "#F5EEFF", // near-white text, warm to pair with neon purple
  muted: "#9C8BC4", // muted lavender-gray secondary text
  border: "#241534", // near-black panel border
  success: "#22C55E",
  danger: "#F4506D",
  accent: "#D68CFF", // light neon lavender secondary accent
  warning: "#FFB84D",
  highlight: "#8B5CF6",
  // Decorative variety palette — every entry stays inside the neon purple/violet/magenta
  // family (never a different hue) so "touches of color" always read as neon purple, not a
  // rainbow. Used for badges/icons/avatars where a bit of per-item variety helps scanning.
  teal: "#7B2FFF",
  pink: "#E066FF",
  gold: "#C77DFF",
  sky: "#9D4EFF",
  coral: "#BA55FF",
  lime: "#9333EA",
};

// Rotating set used to assign a stable-but-varied accent color to a list of items (friends,
// groups, competitions...) purely from their id/name, so the same item always gets the same
// color without a lookup table. All shades stay within the neon purple family.
export const accentPalette = [colors.primary, colors.teal, colors.pink, colors.sky, colors.gold, colors.coral, colors.lime];

export function accentForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return accentPalette[hash % accentPalette.length];
}

export const spacing = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const radii = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 28,
    elevation: 6,
  },
  glow: {
    shadowColor: "#B026FF",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 3,
  },
  // Applied to whatever the user just tapped/picked (a pill, an outcome, a card) so
  // "selected" is unmistakable at a glance, not just a subtle color shift.
  selected: {
    shadowColor: "#B026FF",
    shadowOpacity: 0.65,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 8,
  },
  // Applied to cancelled/rejected/declined states — a red glow so a dead item reads as
  // "stopped" from across the screen, not just from its status label text.
  cancelled: {
    shadowColor: "#F4506D",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 8,
  },
};

export const fonts = {
  system: "System",
};

export const fontSizes = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
  hero: 32,
};

export const fontWeights = {
  regular: "400",
  medium: "600",
  bold: "800",
  black: "900",
};
