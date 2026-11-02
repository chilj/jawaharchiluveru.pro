// Site color scheme: a preset or custom accent/secondary colors from content/theme.yaml,
// expanded into the CSS tokens global.css uses.
//
// WCAG 2.1 AA guardrail: every pairing the site draws is checked, and colors are nudged darker
// (light mode) or lighter (dark mode) until it passes:
//   1.4.3 text contrast 4.5:1 — accent text on page, cards and accent tints; button text on accent;
//         secondary text on page and cards; text on secondary; body text on tile and highlight tints.
//   1.4.11 non-text contrast 3:1 — filled vs empty meter segments and evidence-map cells.
//   Background glows are softened until body and grey text still pass where all three overlap.

type Mode = 'light' | 'dark';
type Pair = { accent: string; secondary: string };
export type Preset = { label: string; light: Pair; dark: Pair; warm: string };

export const PRESETS: Record<string, Preset> = {
  ocean: { label: 'Ocean (blue & teal)', light: { accent: '#2f5bd3', secondary: '#0f9b8e' }, dark: { accent: '#7d9cff', secondary: '#3fd1c1' }, warm: '#e99628' },
  emerald: { label: 'Emerald (green & blue)', light: { accent: '#0b7a5c', secondary: '#2563eb' }, dark: { accent: '#3ddc9f', secondary: '#7aa7ff' }, warm: '#e0a82e' },
  indigo: { label: 'Indigo (violet & pink)', light: { accent: '#4f46e5', secondary: '#c0267a' }, dark: { accent: '#a5a8ff', secondary: '#f08ac0' }, warm: '#f0a050' },
  graphite: { label: 'Graphite (slate & teal)', light: { accent: '#334155', secondary: '#0f766e' }, dark: { accent: '#cbd5e1', secondary: '#5eead4' }, warm: '#d6a35c' },
  sunset: { label: 'Sunset (orange & purple)', light: { accent: '#c2410c', secondary: '#7c3aed' }, dark: { accent: '#fdba74', secondary: '#c4b5fd' }, warm: '#f472b6' },
  crimson: { label: 'Crimson (red & navy)', light: { accent: '#b91c1c', secondary: '#1d4ed8' }, dark: { accent: '#fca5a5', secondary: '#93c5fd' }, warm: '#f59e0b' },
};

/** WCAG 2.1 AA minimums. */
export const AA = { text: 4.5, nonText: 3 } as const;

// Neutrals stay fixed so any palette reads well. They match global.css.
const NEUTRAL: Record<Mode, { bg: string; surface: string; text: string; muted: string; onAccent: string }> = {
  light: { bg: '#f7f8fb', surface: '#ffffff', text: '#141821', muted: '#495063', onAccent: '#ffffff' },
  dark: { bg: '#0c0f15', surface: '#151922', text: '#e8ebf2', muted: '#9aa2b5', onAccent: '#0c0f15' },
};

// ---- color math ----
const hex = (h: string) => {
  const m = h.trim().replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
/** sRGB mix, matching CSS `color-mix(in srgb, a, b t)`. */
const mix = (a: string, b: string, t: number) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const isHex = (v?: string) => !!v && /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
const normal = (v: string) => `#${v.trim().replace('#', '').toLowerCase()}`;

/** WCAG 2.1 relative luminance. */
function luminance(h: string) {
  const [r, g, b] = hex(h).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG 2.1 contrast ratio. */
export const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const rgba = (h: string, a: number) => `rgb(${hex(h).join(' ')} / ${a})`;

export type Check = { mode: Mode; pair: string; fg: string; bg: string; ratio: number; min: number; pass: boolean };

/** Nudge `start` towards black (light) or white (dark) in small steps until `ok` passes. */
function nudge(start: string, mode: Mode, ok: (c: string) => boolean) {
  const target = mode === 'light' ? '#000000' : '#ffffff';
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const c = mix(start, target, t);
    if (ok(c)) return c;
  }
  return target;
}

export type ThemeInput = {
  preset?: string;
  custom?: Partial<Record<Mode, { accent?: string; secondary?: string }>>;
};

function modeTokens(mode: Mode, preset: Preset, custom: { accent?: string; secondary?: string } = {}) {
  const n = NEUTRAL[mode];
  const requested = {
    accent: isHex(custom.accent) ? normal(custom.accent!) : preset[mode].accent,
    secondary: isHex(custom.secondary) ? normal(custom.secondary!) : preset[mode].secondary,
  };
  const softOf = (accent: string) => mix(n.bg, accent, mode === 'light' ? 0.1 : 0.17);

  // Accent: text on page, cards and its own tint; button text on accent; meters on their track.
  const accent = nudge(requested.accent, mode, (a) => {
    const soft = softOf(a);
    return [n.bg, n.surface, soft].every((b) => contrast(a, b) >= AA.text) && contrast(n.onAccent, a) >= AA.text;
  });
  const accentSoft = softOf(accent);

  // Secondary: badge text on page and cards; panel text on the gradient's secondary end.
  const secondary = nudge(requested.secondary, mode, (s) =>
    [n.bg, n.surface].every((b) => contrast(s, b) >= AA.text) && contrast(n.onAccent, s) >= AA.text);

  // Tints that carry body text: lighten the mix until text passes 4.5:1.
  const tint = (base: string, color: string, want: number) => {
    for (let t = want; t >= 0; t -= 0.02) {
      const c = mix(base, color, t);
      if (contrast(n.text, c) >= AA.text) return c;
    }
    return base;
  };
  const shade3 = tint(accentSoft, accent, 0.42);
  const shade2 = tint(accentSoft, accent, 0.3);
  const markBg = tint(n.surface, secondary, 0.28);

  // Background glows: each sits in its own corner, so check body and grey text over each glow at
  // full strength and soften that glow until both pass.
  const base = mode === 'light' ? { a: 0.28, b: 0.22, c: 0.16 } : { a: 0.22, b: 0.13, c: 0.08 };
  const glowScale = (color: string, alpha: number) => {
    let k = 1;
    while (k > 0 && [n.text, n.muted].some((t) => contrast(t, mix(n.bg, color, alpha * k)) < AA.text)) k = Math.round((k - 0.05) * 100) / 100;
    return k;
  };
  const scale = { a: glowScale(accent, base.a), b: glowScale(secondary, base.b), c: glowScale(preset.warm, base.c) };
  const glowPeaks = { a: mix(n.bg, accent, base.a * scale.a), b: mix(n.bg, secondary, base.b * scale.b), c: mix(n.bg, preset.warm, base.c * scale.c) };

  const tokens = {
    '--accent': accent,
    '--teal': secondary,
    '--on-accent': n.onAccent,
    '--accent-soft': accentSoft,
    '--shade-3': shade3,
    '--shade-2': shade2,
    '--mark-bg': markBg,
    '--dot': rgba(accent, mode === 'light' ? 0.16 : 0.14),
    '--glow-a': rgba(accent, +(base.a * scale.a).toFixed(3)),
    '--glow-b': rgba(secondary, +(base.b * scale.b).toFixed(3)),
    '--glow-c': rgba(preset.warm, +(base.c * scale.c).toFixed(3)),
  };

  const check = (pair: string, fg: string, bg: string, min: number): Check => {
    const ratio = contrast(fg, bg);
    return { mode, pair, fg, bg, ratio: Math.round(ratio * 100) / 100, min, pass: ratio >= min };
  };
  const checks: Check[] = [
    check('accent text on page', accent, n.bg, AA.text),
    check('accent text on cards', accent, n.surface, AA.text),
    check('accent text on accent tint', accent, accentSoft, AA.text),
    check('button text on accent', n.onAccent, accent, AA.text),
    check('secondary text on page', secondary, n.bg, AA.text),
    check('secondary text on cards', secondary, n.surface, AA.text),
    check('panel text on secondary', n.onAccent, secondary, AA.text),
    check('body text on accent tint', n.text, accentSoft, AA.text),
    check('body text on mid tile', n.text, shade3, AA.text),
    check('body text on light tile', n.text, shade2, AA.text),
    check('body text on search highlight', n.text, markBg, AA.text),
    ...(['a', 'b', 'c'] as const).flatMap((g) => [
      check(`body text on glow ${g}`, n.text, glowPeaks[g], AA.text),
      check(`grey text on glow ${g}`, n.muted, glowPeaks[g], AA.text),
    ]),
    check('meter fill vs track', accent, accentSoft, AA.nonText),
  ];
  const adjusted = (['accent', 'secondary'] as const)
    .filter((k) => (k === 'accent' ? accent : secondary) !== requested[k])
    .map((k) => ({ mode, color: k, requested: requested[k], used: k === 'accent' ? accent : secondary }));
  for (const g of ['a', 'b', 'c'] as const) {
    if (scale[g] < 1) adjusted.push({ mode, color: `glow ${g}` as any, requested: '100%', used: `${Math.round(scale[g] * 100)}%` });
  }
  return { tokens, checks, adjusted };
}

export function buildTheme(input: ThemeInput = {}) {
  const preset = PRESETS[input.preset ?? 'ocean'] ?? PRESETS.ocean;
  const light = modeTokens('light', preset, input.custom?.light);
  const dark = modeTokens('dark', preset, input.custom?.dark);
  const decl = (t: Record<string, string>) => Object.entries(t).map(([k, v]) => `${k}:${v}`).join(';');
  // `html:root` outranks global.css's `:root`, whatever order the stylesheets load in.
  const css = `html:root{${decl(light.tokens)}}`
    + `@media (prefers-color-scheme: dark){html:root:not([data-theme="light"]){${decl(dark.tokens)}}}`
    + `html:root[data-theme="dark"]{${decl(dark.tokens)}}`;
  return {
    css, light: light.tokens, dark: dark.tokens,
    checks: [...light.checks, ...dark.checks],
    adjusted: [...light.adjusted, ...dark.adjusted],
  };
}
