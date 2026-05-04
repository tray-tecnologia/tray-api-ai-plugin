const SUFFIXES = [
  'amente',
  'mente',
  'ações', 'ação',
  'acoes', 'acao',
  'ões',
  'amos', 'emos', 'imos',
  'aram', 'eram', 'iram',
  'ado', 'ada', 'ido', 'ida',
  'ando', 'endo', 'indo',
  'ia',
  'ar', 'er', 'ir',
  'os',
  'es',
  'o',
  's'
];

const MIN_LENGTH = 3;

export function stem(word) {
  if (typeof word !== 'string') return '';
  let w = word.toLowerCase();
  if (w.length <= MIN_LENGTH) return w;
  let prev = '';
  while (w !== prev && w.length > MIN_LENGTH) {
    prev = w;
    let stripped = false;
    for (const suf of SUFFIXES) {
      if (w.endsWith(suf) && w.length - suf.length >= MIN_LENGTH) {
        w = w.slice(0, -suf.length);
        stripped = true;
        break;
      }
    }
    if (!stripped) break;
  }
  return w;
}

export function stemTokens(tokens) {
  if (!Array.isArray(tokens)) return [];
  return tokens.map(stem);
}
