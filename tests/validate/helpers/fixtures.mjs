/**
 * Fixtures compartilhadas entre os testes da skill formats-br e os testes
 * por skill. CPFs e CNPJs são exemplos canônicos publicamente conhecidos
 * (geradores online da Receita Federal). EANs são GTINs reais de produtos
 * comerciais retirados do GS1.
 */

export const CPFS_VALIDOS = [
  '52998224725',
  '11144477735',
  '04094427473',
  '14471271105',
  '94567382994',
];

export const CPFS_INVALIDOS = [
  '11111111111',     // todos os dígitos iguais
  '00000000000',     // todos zeros
  '12345678900',     // DV errado
  '52998224726',     // último DV alterado
  '529982247',       // < 11 dígitos
  '5299822472512',   // > 11 dígitos
  '529982247AB',     // não-numérico
];

export const CNPJS_VALIDOS = [
  '11222333000181',
  '06990590000123',
  '34028316000103',
  '00000000000191',  // CNPJ canônico do Banco do Brasil (dígito de teste)
];

export const CNPJS_INVALIDOS = [
  '11111111111111',  // todos iguais
  '00000000000000',  // todos zeros
  '12345678901234',  // DV errado
  '11222333000180',  // último DV alterado
  '1122233300018',   // < 14 dígitos
  '112223330001815', // > 14 dígitos
];

export const CEPS_VALIDOS = [
  '01310100',  // Av. Paulista, SP
  '20040020',  // Centro RJ
  '30130100',  // BH
];

export const CEPS_INVALIDOS = [
  '1234567',   // 7 dígitos
  '123456789', // 9 dígitos
  '1234ABCD',  // não-numérico
  '',          // vazio
];

export const EANS_VALIDOS = [
  '7891000100103',  // GTIN-13 — Nestlé Leite Moça
  '7891149105113',  // GTIN-13
  '0123456789012',  // GTIN-13 calculado
  '12345670',       // GTIN-8
];

export const EANS_INVALIDOS = [
  '7891000100100',  // DV errado (correto é ...103)
  '789100010010',   // 12 dígitos
  '78910001001033', // 14 dígitos com DV errado
  '789100010010A',  // não-numérico
];

export const NCMS_VALIDOS = [
  '61091000',  // Camiseta de algodão
  '85171231',  // Smartphone
  '22021010',  // Refrigerante de cola
];

export const NCMS_INVALIDOS = [
  '6109100',    // 7 dígitos
  '610910000',  // 9 dígitos
  '6109100A',   // não-numérico
  '',
];

export const DATES_VALIDAS = [
  '2026-04-15',
  '2024-02-29',  // bissexto
  '2026-12-31',
];

export const DATES_INVALIDAS = [
  '15/04/2026',  // formato BR
  '2026-13-01',  // mês > 12
  '2026-04-31',  // dia inválido para abril
  '2025-02-29',  // não-bissexto
  '2026-4-15',   // sem zero à esquerda
  'abc',
];

export const DATETIMES_VALIDAS = [
  '2026-04-15 14:30:00',
  '2026-12-31 23:59:59',
];

export const DATETIMES_INVALIDAS = [
  '2026-04-15T14:30:00',  // ISO com T
  '2026-04-15 25:00:00',  // hora > 23
  '2026-04-15 14:60:00',  // minuto > 59
  '2026-04-15',           // sem hora
];

export const EMAILS_VALIDOS = [
  'usuario@dominio.com',
  'first.last+tag@example.com.br',
  'a@b.co',
];

export const EMAILS_INVALIDOS = [
  'usuario.dominio.com',  // sem @
  '@dominio.com',         // sem local
  'usuario@',             // sem domínio
  'usuario@dominio',      // sem TLD
  'us uario@dominio.com', // espaço
];

export const URIS_VALIDAS = [
  'https://developers.tray.com.br',
  'http://localhost:3000/path?q=1',
  'https://example.com',
];

export const URIS_INVALIDAS = [
  'developers.tray.com.br',  // sem protocolo
  'ftp://example.com',       // protocolo errado
  'javascript:void(0)',      // protocolo errado
  '',
];
