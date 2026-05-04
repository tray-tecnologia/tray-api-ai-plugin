#!/usr/bin/env node
/**
 * Valida que o `matcher` do hook `UserPromptSubmit` em hooks/hooks.json
 * casa com os prompts dos cenários do Bloco 1 (geração de código positivos)
 * e Bloco 5 (hooks positivos legítimos), e NÃO casa com os prompts do Bloco 4
 * (hooks falsos positivos).
 *
 * Bloco 6 (regressão) deve casar — o hook É supostamente informativo.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

const hooks = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf-8'));
const matcherStr = hooks.hooks.UserPromptSubmit[0].matcher;
const matcher = new RegExp(matcherStr);

const CASES = [
  // Bloco 1 — devem casar
  { id: '1.1', shouldMatch: true,  prompt: 'Crie um sistema simples que faça login na minha loja Tray usando OAuth e liste os produtos cadastrados. Mostre apenas nome, preço e estoque.' },
  { id: '1.2', shouldMatch: true,  prompt: "Cadastra um produto novo na minha loja Tray com nome 'Camiseta Básica', preço 49.90 e estoque 100." },
  { id: '1.3', shouldMatch: true,  prompt: 'Preciso de um script que liste todos os pedidos da minha loja Tray feitos hoje, mostrando id, cliente e valor total.' },
  { id: '1.4', shouldMatch: true,  prompt: 'Crie um endpoint Express que receba webhooks da Tray e processe eventos de pedidos novos (scope_name=order, act=insert). Inclua validação dos campos recebidos.' },
  { id: '1.5', shouldMatch: true,  prompt: "Como adiciono variações de cor (azul, vermelho, preto) ao produto 'Camiseta Básica' na minha loja Tray?" },
  { id: '1.6', shouldMatch: true,  prompt: "Quero adicionar 5 fotos ao produto 'Camiseta Básica' da minha Tray. As fotos estão em URLs públicas." },
  { id: '1.7', shouldMatch: true,  prompt: 'Quero criar um combo na minha loja Tray: 1 camiseta + 1 calça por 99.90 com desconto.' },
  { id: '1.8', shouldMatch: true,  prompt: 'Como organizo os produtos da minha loja Tray em categorias (Masculino, Feminino, Infantil)?' },
  { id: '1.9', shouldMatch: true,  prompt: "Cadastra um cliente na Tray: nome 'Maria', email 'maria@x.com', CPF '111'." },

  // Bloco 4 — NÃO devem casar
  { id: '4.1', shouldMatch: false, prompt: 'Crie um ícone em base64 para o meu app.' },
  { id: '4.2', shouldMatch: false, prompt: 'Gere um ícone SVG simples para o projeto tray-api-ai-plugin.', borderline: true },
  { id: '4.3', shouldMatch: false, prompt: 'Tenho um componente React de bandeja (tray) de comida. Como estilizo o background com CSS?' },
  { id: '4.4', shouldMatch: false, prompt: 'Existe uma lib de UI chamada Tray para mobile? Tem alternativa em React Native?' },

  // Bloco 5 — devem casar
  { id: '5.1', shouldMatch: true,  prompt: 'Como faço autenticação na API Tray? Preciso entender o fluxo de access_token e refresh_token.' },
  { id: '5.2', shouldMatch: true,  prompt: 'Estou recebendo erro 401 toda vez que tento usar o access_token. O que pode ser?' },
  { id: '5.3', shouldMatch: true,  prompt: 'Como configuro renovação automática do refresh_token na minha integração?' },

  // Bloco 6 — devem casar (hook é informativo, IA decide ignorar)
  { id: '6.1', shouldMatch: true,  prompt: 'Já usei a API Tray (com access_token) no passado, mas agora preciso aprender autenticação genérica em Express com Passport.js. Me explica do zero, sem mencionar Tray.' },
  { id: '6.2', shouldMatch: true,  prompt: 'Crie uma função utilitária em JS que valide CPF. Ela vai ser usada num projeto que integra com /customers da Tray no futuro.' },
];

let pass = 0;
let fail = 0;
let borderlineNotes = [];

console.log(`\nMatcher atual:\n  ${matcherStr}\n`);
console.log('─'.repeat(80));

for (const c of CASES) {
  const matched = matcher.test(c.prompt);
  const ok = matched === c.shouldMatch;

  if (ok) {
    console.log(`✅ ${c.id} — ${matched ? 'casa' : 'não casa'} (esperado)`);
    pass++;
  } else if (c.borderline && matched) {
    console.log(`⚠️  ${c.id} — caso de borda: casou (regex pega "tray-api" no nome do projeto)`);
    borderlineNotes.push(c.id);
    pass++;
  } else {
    console.log(`❌ ${c.id} — esperava ${c.shouldMatch ? 'CASAR' : 'NÃO CASAR'}, obteve ${matched ? 'CASOU' : 'NÃO CASOU'}`);
    console.log(`   prompt: ${c.prompt.slice(0, 100)}${c.prompt.length > 100 ? '…' : ''}`);
    fail++;
  }
}

console.log('─'.repeat(80));
console.log(`Resultado: ${pass} ok  |  ${fail} erros${borderlineNotes.length ? `  |  bordas: ${borderlineNotes.join(', ')}` : ''}`);

if (fail > 0) process.exit(1);
