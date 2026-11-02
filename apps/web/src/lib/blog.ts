/** "November 2, 2026" (US English, independent of the build machine's locale and time zone). */
export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

/** Reading time at about 230 words a minute, ignoring tables, code and HTML comments. */
export function readingMinutes(markdown: string) {
  const text = markdown.replace(/<!--[\s\S]*?-->/g, '').replace(/```[\s\S]*?```/g, '').replace(/^\|.*$/gm, '');
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 230));
}
