export type TextPart = { kind: 'text'; value: string } | { kind: 'link'; href: string; label: string };

const URL_RE = /https?:\/\/[^\s<>"']+[^\s<>"'.,;:)\]]/g;

/** Splits text into plain parts and links, so React can render links without innerHTML. */
export function linkParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ kind: 'text', value: text.slice(last, start) });
    parts.push({ kind: 'link', href: match[0], label: shortUrl(match[0]) });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) });
  return parts;
}

/** "servicenow.com › cmdb-data-management" instead of a 150-character URL. */
export function shortUrl(href: string): string {
  try {
    const u = new URL(href);
    const page = u.pathname.split('/').filter(Boolean).pop()?.replace(/\.html?$/, '') ?? '';
    return page ? `${u.hostname.replace(/^www\./, '')} › ${page}` : u.hostname;
  } catch {
    return href;
  }
}

/** Explanations end with "Source: a; b". Separate that so sources can be shown as chips. */
export function splitExplanation(text: string | undefined): { body: string; sources: string[] } {
  if (!text) return { body: '', sources: [] };
  const idx = text.lastIndexOf('Source:');
  if (idx < 0) return { body: text.trim(), sources: [] };
  const body = text.slice(0, idx).trim();
  const sources = text
    .slice(idx + 'Source:'.length)
    .split(/;\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { body, sources };
}
