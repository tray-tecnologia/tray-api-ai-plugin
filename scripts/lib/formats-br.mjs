/**
 * Validadores de formatos brasileiros e correlatos usados no `format`
 * de schemas Tray. Zero-deps; cada função retorna boolean.
 *
 * Política: NÃO normaliza valores antes de validar. Quem chama o
 * validate é responsável por enviar o valor no formato correto que
 * vai pra API. Pontuação no CPF (529.982.247-25) é rejeitada — o
 * agente é orientado a corrigir.
 */

const onlyDigits = (s) => /^\d+$/.test(s);

/**
 * Calcula o dígito verificador de um array de números pesados pelos
 * fatores fornecidos, módulo 11. Usado por CPF e CNPJ.
 */
function modulo11(numbers, factors) {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i] * factors[i];
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isCPF(value) {
  if (typeof value !== 'string') return false;
  if (value.length !== 11) return false;
  if (!onlyDigits(value)) return false;
  if (/^(\d)\1{10}$/.test(value)) return false; // todos iguais

  const digits = value.split('').map(Number);
  const dv1 = modulo11(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (dv1 !== digits[9]) return false;
  const dv2 = modulo11(digits.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (dv2 !== digits[10]) return false;
  return true;
}

export function isCNPJ(value) {
  if (typeof value !== 'string') return false;
  if (value.length !== 14) return false;
  if (!onlyDigits(value)) return false;
  if (/^(\d)\1{13}$/.test(value)) return false;

  const digits = value.split('').map(Number);
  const f1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const f2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv1 = modulo11(digits.slice(0, 12), f1);
  if (dv1 !== digits[12]) return false;
  const dv2 = modulo11(digits.slice(0, 13), f2);
  if (dv2 !== digits[13]) return false;
  return true;
}

export function isCEP(value) {
  return typeof value === 'string' && value.length === 8 && onlyDigits(value);
}

/**
 * GTIN-8/12/13/14 com algoritmo de DV (módulo 10 com pesos 3 e 1
 * alternados a partir da direita, antes do DV).
 */
export function isEAN(value) {
  if (typeof value !== 'string') return false;
  if (![8, 12, 13, 14].includes(value.length)) return false;
  if (!onlyDigits(value)) return false;

  const digits = value.split('').map(Number);
  const dv = digits.pop();
  let sum = 0;
  for (let i = digits.length - 1, multiplier = 3; i >= 0; i--, multiplier = 4 - multiplier) {
    sum += digits[i] * multiplier;
  }
  const expected = (10 - (sum % 10)) % 10;
  return dv === expected;
}

export function isNCM(value) {
  return typeof value === 'string' && value.length === 8 && onlyDigits(value);
}

export function isDate(value) {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function isDatetime(value) {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return false;
  const [datePart, timePart] = value.split(' ');
  if (!isDate(datePart)) return false;
  const [h, mi, s] = timePart.split(':').map(Number);
  return h >= 0 && h <= 23 && mi >= 0 && mi <= 59 && s >= 0 && s <= 59;
}

export function isEmail(value) {
  if (typeof value !== 'string') return false;
  // RFC 5321 simplificada — sem espaços, exige @ e TLD com >= 2 chars
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function isURI(value) {
  if (typeof value !== 'string') return false;
  return /^https?:\/\/.+/.test(value);
}

export const FORMATS = {
  cpf: isCPF,
  cnpj: isCNPJ,
  cep: isCEP,
  ean: isEAN,
  ncm: isNCM,
  date: isDate,
  datetime: isDatetime,
  email: isEmail,
  uri: isURI,
};
