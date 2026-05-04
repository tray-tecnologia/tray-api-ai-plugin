function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseHeading(line) {
  const m = line.match(/^(#{1,3})\s+(.+?)\s*$/);
  if (!m) return null;
  return { level: `h${m[1].length}`, title: m[2] };
}

function flushSection(current) {
  if (!current) return null;
  const codeRe = /```(\w*)\n([\s\S]*?)```/g;
  const code = [];
  let m;
  const raw = current.bodyLines.join('\n');
  while ((m = codeRe.exec(raw)) !== null) {
    code.push({ lang: m[1] || 'text', content: m[2].trim() });
  }
  codeRe.lastIndex = 0;
  const body = raw.replace(codeRe, '').replace(/\n{3,}/g, '\n\n').trim();
  return {
    h1: current.h1,
    h2: current.h2,
    h3: current.h3,
    title: current.title,
    level: current.level,
    anchor: slugify(current.title),
    body,
    code,
  };
}

export function splitMarkdown(md) {
  if (typeof md !== 'string' || md.trim() === '') return [];
  const lines = md.split('\n');
  const sections = [];
  let h1 = null;
  let h2 = null;
  let h3 = null;
  let current = null;
  for (const line of lines) {
    const h = parseHeading(line);
    if (h) {
      const flushed = flushSection(current);
      if (flushed) sections.push(flushed);
      if (h.level === 'h1') {
        h1 = h.title;
        h2 = null;
        h3 = null;
      } else if (h.level === 'h2') {
        h2 = h.title;
        h3 = null;
      } else if (h.level === 'h3') {
        h3 = h.title;
      }
      current = {
        h1,
        h2,
        h3,
        title: h.title,
        level: h.level,
        bodyLines: [],
      };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  const flushed = flushSection(current);
  if (flushed) sections.push(flushed);
  return sections;
}
