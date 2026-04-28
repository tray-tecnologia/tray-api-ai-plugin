# Design Spec — Cenários de Teste para o Plugin Tray

**Data:** 2026-04-28
**Motivação:** As mudanças da branch `feat/skill-validation-and-disambiguation` (validação executável de payloads, `when_not_to_use`, "Antes de responder", revisão dos hooks) precisam ser exercitadas em outros repositórios para confirmar que a geração de código com o plugin é eficiente e que as travas de hooks ficaram corretas (sem falsos positivos por menção a "tray", sem interromper operações não-Tray).
**Entregável:** documento `docs/CENARIOS-DE-TESTE.md` com 32 cenários numerados, cada um com prompt literal, resultado esperado e checklist binário.

---

## Contexto

A comparação `main..feat/skill-validation-and-disambiguation` mostra estas mudanças:

| Categoria | Mudança |
|:--|:--|
| Hooks | `UserPromptSubmit` matcher passou de `tray\|Tray\|TRAY\|api_address\|access_token.*tray` (genérico) para um regex específico (`api.*tray\|tray.*api\|api_address\|consumer_key\|consumer_secret\|refresh_token\|developers\.tray\|/products\|/orders\|/customers\|/auth`). Prompt do hook reescrito com aviso "APENAS informativo — nunca interrompa". |
| Hooks | `PostToolUse` (Write/Edit) ampliado: além de checar tokens hardcoded, agora checa URL fora do padrão, ausência da chave-envelope no body de POST/PUT, e sugere `validate.mjs` quando aplicável. |
| Hooks | Novo `PostToolUse` (Bash) que analisa saída de comandos: orienta em HTTP 401, 429, 400 e 404 — e fica calado se a saída não tem chamada à API Tray. |
| Disambiguação | Campo `when_not_to_use` adicionado ao frontmatter de todas as 34 skills. |
| Mandatory checks | Seção `## Antes de responder` adicionada em todas as 34 skills (4 passos comuns + passo 5 nas 5 com schema). |
| Validação executável | JSON Schema + `scripts/validate.mjs` em 5 skills prioritárias (`produtos`, `pedidos`, `autorizacao`, `webhooks`, `clientes`) com lib compartilhada em `scripts/lib/validate-schema.mjs` — sem deps npm. |
| Smoke test | `scripts/smoke-test.js` expandido com 9 seções, incluindo execução real dos `validate.mjs`. |

Sem este documento de cenários, validar manualmente cada mudança em outras stacks (apps de parceiros, repos de demo) depende da memória individual de quem testa — não há checklist reproduzível.

---

## Objetivo

Produzir um documento markdown único que permita a uma pessoa, em outro repositório, validar manualmente o plugin nas três principais ferramentas suportadas (Claude Code, Cursor, Codex) com cenários reproduzíveis e critérios binários — em ~30-45 minutos por ferramenta.

Não-objetivos da v1:

- Automação de execução (CLI runner, captura de transcript, diff de output).
- Cobertura completa das 34 skills (29 restantes ficam como "robustez futura").
- Cobertura ampla das 4 ferramentas secundárias (Gemini CLI, Copilot, JetBrains, Windsurf) — apenas smoke test.

---

## Decisões de design

| Decisão | Escolha |
|:--|:--|
| Audiência / fluxo | Manual + visual: pessoa abre cada ferramenta, copia o prompt, observa a resposta, marca o checklist à mão. |
| Cobertura por ferramenta | Cenários completos em **Claude Code, Cursor, Codex**. **Gemini CLI, Copilot, JetBrains, Windsurf** ficam num bloco final de smoke test (1 prompt por ferramenta). |
| Formato de critérios | Checklist binário (`[ ]` / `[x]` / `[!]`) por cenário + campo de observações livre. Sem tabela comparativa consolidada no fim. |
| Organização | Cards agrupados por bloco (categoria de mudança). Cenários têm ID estável `N.M`. Seção genérica única "Como verificar em cada ferramenta", reutilizada por todos os cenários. |
| Local do arquivo | `docs/CENARIOS-DE-TESTE.md` (raiz de docs, all-caps — combina com `RELEASE-DISTRIBUICAO-CHECKLIST.md`). |
| Nível de população | Todos os cenários nascem completos (prompt, resultado esperado, checklist com itens vazios prontos para marcar, observações vazias). |

---

## Arquitetura do documento

```
docs/CENARIOS-DE-TESTE.md
│
├── # Cenários de Teste — Tray API Plugin
│   └── intro: o que valida, em que ferramentas, em que branch nasceu
│
├── ## Como usar este documento
│   ├── Pré-requisitos (plugin instalado em CC / Cursor / Codex)
│   ├── Fluxo: ler cenário → copiar prompt → colar na ferramenta → marcar checklist
│   ├── Convenção dos IDs (1.1, 4.2, ...)
│   └── Convenção do checklist: [ ] não testado, [x] passou, [!] falhou
│
├── ## Como verificar em cada ferramenta  ← seção genérica reutilizada
│   ├── 3.1 Skill selecionada — CC / Cursor / Codex
│   ├── 3.2 Seção "Antes de responder" foi seguida
│   ├── 3.3 Hook UserPromptSubmit disparou (CC / Cursor)
│   ├── 3.4 validate.mjs foi executado
│   ├── 3.5 Hook PostToolUse disparou (CC / Cursor)
│   ├── 3.6 Sem credenciais hardcoded
│   └── 3.7 Endpoint correto para a operação
│
├── ## Bloco 1 — Geração de código (positivos legítimos)
│   ├── ### 1.1 — Login + listar produtos
│   ├── ### 1.2 — Criar produto simples
│   ├── ### 1.3 — Listar pedidos do dia
│   ├── ### 1.4 — Cadastrar cliente B2C
│   └── ### 1.5 — Configurar webhook de pedidos
│
├── ## Bloco 2 — Disambiguação (when_not_to_use)
│   ├── ### 2.1 — Cores de produto
│   ├── ### 2.2 — Fotos do produto
│   ├── ### 2.3 — Combo de produtos
│   └── ### 2.4 — Categorizar produtos
│
├── ## Bloco 3 — Validação de payload (validate.mjs + regras BR)
│   ├── ### 3.1 — Produto sem campo obrigatório
│   ├── ### 3.2 — Cliente com CPF malformado
│   └── ### 3.3 — Webhook recebido sem campo `act`
│
├── ## Bloco 4 — Hooks: falsos positivos  ← apenas CC / Cursor
│   ├── ### 4.1 — Ícone base64 para meu app
│   ├── ### 4.2 — Ícone para projeto tray-api-claude-plugin
│   ├── ### 4.3 — "Tray de comida" em CSS
│   └── ### 4.4 — Lib de UI chamada Tray
│
├── ## Bloco 5 — Hooks: positivos legítimos  ← apenas CC / Cursor
│   ├── ### 5.1 — Autenticação na API Tray
│   ├── ### 5.2 — Erro 401 com access_token
│   └── ### 5.3 — Configurar refresh_token
│
├── ## Bloco 6 — Hooks: regressão (nunca interrompe)  ← apenas CC / Cursor
│   ├── ### 6.1 — Hook dispara mas pedido é não-Tray
│   └── ### 6.2 — Pedido principal não-Tray com menção tangencial
│
├── ## Bloco 7 — PostToolUse (Write/Edit/Bash)  ← apenas CC / Cursor
│   ├── 7A — Write|Edit
│   │   ├── ### 7.1 — Tentar hardcodar access_token
│   │   └── ### 7.2 — Falta da chave-envelope em POST
│   └── 7B — Bash
│       ├── ### 7.3 — HTTP 401 (token inválido/expirado)
│       ├── ### 7.4 — HTTP 429 (rate limit)
│       ├── ### 7.5 — HTTP 400 (campo obrigatório / formato inválido)
│       ├── ### 7.6 — HTTP 404 (URL base errada / api_address incorreto)
│       └── ### 7.7 — Bash sem chamada à Tray (regressão — hook NÃO responde)
│
├── ## Bloco 8 — Smoke test ferramentas secundárias
│   ├── ### 8.1 — Gemini CLI
│   ├── ### 8.2 — GitHub Copilot (VS Code)
│   ├── ### 8.3 — JetBrains AI Assistant
│   └── ### 8.4 — Windsurf
│
└── ## Próximos passos (robustez futura)
    └── lista de cenários extras a adicionar (1099, 429 com curva backoff,
        paginação ≥ 50, datas BR, kits, multi-CD, skills B2B, NF-e, ...)
```

**Total: 32 cenários distribuídos em 8 blocos** (5 + 4 + 3 + 4 + 3 + 2 + 7 + 4).

---

## Formato fixo de cada cenário

Todos os 32 cenários seguem este template-card:

```markdown
### N.M — Título curto

**Aplicável a:** Claude Code · Cursor · Codex   ← (ou subset, ex.: "apenas CC e Cursor")
**Bloco:** <Nome do bloco>
**O que valida:** <1 frase ligando o cenário à mudança que ele exercita>

#### Prompt (copy-paste)

> <prompt literal, autossuficiente, em PT-BR>

#### Resultado esperado (resumo)

A IA deve:
1. <item esperado>
2. <item esperado>
3. <item esperado>

#### Checklist de verificação

> Marque `[x]` para passou, `[!]` para falhou, `[ ]` se não testado.
> Veja [§ Como verificar em cada ferramenta](#como-verificar-em-cada-ferramenta).

- [ ] **Skills selecionadas:** <esperado>
- [ ] **"Antes de responder" seguida:** <esperado>
- [ ] **Endpoints corretos:** <esperado>
- [ ] **Sem credenciais hardcoded:** <esperado>
- [ ] **`validate.mjs` executado:** <esperado, se aplicável>
- [ ] **Hook UserPromptSubmit disparou** (apenas CC / Cursor): <esperado>
- [ ] **Hook não interrompeu a operação:** <esperado>

#### Observações

```
(espaço livre para anotar nuances do que aconteceu em cada ferramenta)
```
```

---

## Conteúdo da seção "Como verificar em cada ferramenta"

Cada um dos 7 critérios documenta o caminho preciso por ferramenta + um *fallback* quando o sinal não é direto.

### 3.1 Skill selecionada

- **Claude Code** — painel "Tool uses" → procurar `Skill(tray-<recurso>)`. Fallback: menções textuais a `skills/<recurso>/SKILL.md` na resposta.
- **Cursor** — painel de chat → "Context" / "Used files" → arquivos `skills/<recurso>/SKILL.md` ou `.cursor/rules/tray-api.mdc`. Fallback: segundo turno *"quais SKILL.md você consultou?"*.
- **Codex CLI** — sem UI rica; procurar no transcript citações ao `name` da skill ou ao caminho `skills/<recurso>/SKILL.md`. Fallback: segundo turno *"qual skill (arquivo SKILL.md) você utilizou?"*.

### 3.2 Seção "Antes de responder" foi seguida

Verificação por inferência (não há sinal direto). Os 4 passos comuns devem ter evidência implícita no código gerado: método/endpoint corretos, campos obrigatórios presentes, tokens via env vars, skill correta vs `when_not_to_use`. O passo 5 (apenas nas 5 com schema) é validado em § 3.4.

### 3.3 Hook `UserPromptSubmit` disparou (apenas CC e Cursor)

- **Claude Code** — turn da resposta → expandir "System" / "Hooks" → texto começando com *"IMPORTANTE: Este contexto é APENAS informativo…"*. Fallback CLI: `claude --debug`.
- **Cursor** — painel de contexto da mensagem ("Additional context"). Fallback: segundo turno *"você recebeu algum aviso/contexto adicional sobre OAuth ou rate limit antes de responder?"*.
- **Codex / Gemini / Copilot / JetBrains / Windsurf:** N/A — não consomem `hooks/hooks.json`.

### 3.4 `validate.mjs` foi executado

- **Claude Code** — painel "Tool uses" → `Bash` tool com `node skills/<recurso>/scripts/validate.mjs '<payload>'`. Output esperado: `✅ Payload válido` ou `❌ Validação falhou`.
- **Cursor** — painel de terminal/shell tools mostra a mesma chamada.
- **Codex CLI** — transcript da sessão exibe a linha do `node skills/.../validate.mjs`.

### 3.5 Hook `PostToolUse` disparou (apenas CC e Cursor)

- **Claude Code** — após `Write|Edit|Bash`, mensagem extra (sistema ou continuação da IA) com aviso (token hardcoded, chave-envelope ausente, sugestão de validate.mjs, ou diagnóstico de HTTP 401/429/400/404).
- **Cursor** — comportamento equivalente; verificar texto no chat após o tool call.

### 3.6 Sem credenciais hardcoded

Buscar no código gerado por strings longas em literal e atribuições do tipo `access_token = "..."`. Esperado: uso de `process.env.TRAY_*` ou equivalente da linguagem.

### 3.7 Endpoint correto para a operação

Conferir URL gerada vs skill correspondente:

- `tray-autorizacao`: `POST {api_address}/auth`, `GET {api_address}/auth?refresh_token=…`
- `tray-produtos`: `GET/POST/PUT/DELETE {api_address}/products`
- `tray-pedidos`: `GET/POST/PUT {api_address}/orders`
- `tray-clientes`: `GET/POST/PUT {api_address}/customers`
- `tray-webhooks`: `GET/POST {api_address}/notifications`

`access_token` deve estar como query parameter, nunca em header.

---

## Lista completa dos 32 cenários

Cada item lista o **prompt literal** + **expectativa-chave**. O documento final expande para o template-card descrito acima, com checklist e observações vazios.

### Bloco 1 — Geração de código (positivos legítimos) — 5 cenários

**1.1 — Login + listar produtos**
> Crie um sistema simples que faça login na minha loja Tray usando OAuth e liste os produtos cadastrados. Mostre apenas nome, preço e estoque.

Esperado: usa `tray-autorizacao` + `tray-produtos`, sem credenciais hardcoded, executa `validate.mjs` em `POST /auth`.

**1.2 — Criar produto simples**
> Cadastra um produto novo na minha loja Tray com nome 'Camiseta Básica', preço 49.90 e estoque 100.

Esperado: `tray-produtos`, payload envelopado em `{"Product": {...}}`, campos `name` e `price` presentes, `validate.mjs` aprovado.

**1.3 — Listar pedidos do dia**
> Preciso de um script que liste todos os pedidos da minha loja Tray feitos hoje, mostrando id, cliente e valor total.

Esperado: `tray-pedidos` (e `tray-autorizacao` se OAuth não estiver pronto), filtro de data `YYYY-MM-DD`, paginação `limit ≤ 50`.

**1.4 — Cadastrar cliente B2C**
> Cria um cliente novo na minha Tray: nome 'João Silva', email 'joao@exemplo.com', CPF '529.982.247-25'.

Esperado: `tray-clientes`, payload envelopado em `{"Customer": {...}}`, CPF normalizado para 11 dígitos, `validate.mjs` aprovado.

**1.5 — Listener de webhook de pedidos**
> Crie um endpoint Express que receba webhooks da Tray e processe eventos de pedidos novos (`scope_name=order`, `act=insert`). Inclua validação dos campos recebidos.

Esperado: usa `tray-webhooks`, gera listener Express que parseia `application/x-www-form-urlencoded`, processa `seller_id`, `scope_id`, `scope_name`, `act`. Roda `validate.mjs` em payload de exemplo recebido — aprovado. A IA deve mencionar que ativação do webhook na Tray é por ticket de suporte (não via API).

### Bloco 2 — Disambiguação (`when_not_to_use`) — 4 cenários

**2.1 — Cores de produto**
> Como adiciono variações de cor (azul, vermelho, preto) ao produto 'Camiseta Básica' na minha loja Tray?

Esperado: `tray-variacoes`, **não** `tray-produtos`. Endpoint `/products/{id}/variants`.

**2.2 — Fotos do produto**
> Quero adicionar 5 fotos ao produto 'Camiseta Básica' da minha Tray. As fotos estão em URLs públicas.

Esperado: `tray-imagens-produtos`, **não** `tray-produtos`. Endpoint `/products/{id}/images`.

**2.3 — Combo de produtos**
> Quero criar um combo na minha loja Tray: 1 camiseta + 1 calça por 99.90 com desconto.

Esperado: `tray-kits`, **não** `tray-produtos`. Endpoint `/kits`.

**2.4 — Categorizar produtos**
> Como organizo os produtos da minha loja Tray em categorias (Masculino, Feminino, Infantil)?

Esperado: `tray-categorias`, **não** `tray-produtos`. Endpoint `/categories`.

### Bloco 3 — Validação de payload (`validate.mjs` + regras BR) — 3 cenários

> Mistura proposital: 3.1 e 3.3 testam o `validate.mjs` rejeitando campos `required` faltantes; 3.2 testa a regra BR de CPF (algoritmo de verificação) que vem do `AGENTS.md` — o `validate.mjs` de `clientes` não tem regex de CPF, apenas `maxLength: 14`. Os dois caminhos juntos cobrem a "validação como um todo" do plugin.

**3.1 — Produto sem campo obrigatório**
> Cria um produto na minha Tray apenas com o preço 99.90, sem nome (vou definir depois).

Esperado: a IA tenta payload, `validate.mjs` rejeita (`name` ausente), IA não devolve código quebrado — corrige ou explica.

**3.2 — Cliente com CPF malformado**
> Cadastra um cliente na Tray: nome 'Maria', email 'maria@x.com', CPF '111'.

Esperado: a IA reconhece CPF inválido pela regra do `AGENTS.md` (11 dígitos + algoritmo) — `validate.mjs` por si só não detecta isso. Não envia o payload, alerta o usuário.

**3.3 — Webhook recebido sem campo `act`**
> Recebi este payload de webhook no meu listener da Tray: `{"seller_id": 100, "scope_id": 200, "scope_name": "order"}`. Como processo isso?

Esperado: a IA roda `validate.mjs` (que rejeita por `act` ausente — campo obrigatório do schema), explica que o payload está incompleto/malformado e que `act` deveria vir com `insert`, `update` ou `delete`.

### Bloco 4 — Hooks: falsos positivos *(apenas CC / Cursor)* — 4 cenários

**4.1 — Ícone base64 para meu app**
> Crie um ícone em base64 para o meu app.

Esperado: hook **NÃO** dispara. Sem menção à API Tray.

**4.2 — Ícone para projeto tray-api-claude-plugin**
> Gere um ícone SVG simples para o projeto tray-api-claude-plugin.

Esperado: hook **NÃO** dispara. "tray" no nome do projeto, sem `api`/`tray.api` correlacionado.

**4.3 — "Tray de comida" em CSS**
> Tenho um componente React de bandeja (tray) de comida. Como estilizo o background com CSS?

Esperado: hook **NÃO** dispara. "tray" fora do contexto de API.

**4.4 — Lib de UI chamada Tray**
> Existe uma lib de UI chamada Tray para mobile? Tem alternativa em React Native?

Esperado: hook **NÃO** dispara.

### Bloco 5 — Hooks: positivos legítimos *(apenas CC / Cursor)* — 3 cenários

**5.1 — Autenticação na API Tray**
> Como faço autenticação na API Tray?

Esperado: hook dispara (`api.*tray`), injeta contexto OAuth.

**5.2 — Erro 401 com access_token**
> Estou recebendo erro 401 toda vez que tento usar o access_token. O que pode ser?

Esperado: hook dispara (`access_token`), injeta contexto.

**5.3 — Configurar refresh_token**
> Como configuro renovação automática do refresh_token na minha integração?

Esperado: hook dispara (`refresh_token`), injeta contexto.

### Bloco 6 — Hooks: regressão (nunca interrompe) *(apenas CC / Cursor)* — 2 cenários

**6.1 — Hook dispara mas pedido é não-Tray**
> Já usei a API Tray no passado, mas agora preciso aprender autenticação genérica em Express com Passport.js. Me explica do zero, sem mencionar Tray.

Esperado: hook dispara (`api.*tray`) mas a IA **não** tenta usar skill da Tray nem injeta conceitos da Tray. Resposta foca em Express + Passport.

**6.2 — Pedido principal não-Tray com menção tangencial**
> Crie uma função utilitária em JS que valide CPF. Ela vai ser usada num projeto que integra com /customers da Tray no futuro.

Esperado: hook dispara (`/customers`) mas IA entrega só a função de validação de CPF; não tenta cadastrar cliente.

### Bloco 7 — `PostToolUse` (Write/Edit/Bash) *(apenas CC / Cursor)* — 7 cenários

**7A — Write|Edit**

**7.1 — Tentar hardcodar access_token**
> Cria um arquivo `tray.js` que faça `GET /products` na minha loja Tray. Pode hardcodar o token por enquanto, depois eu refatoro.

Esperado: após `Write`, hook alerta sobre token hardcoded e sugere env vars.

**7.2 — Falta da chave-envelope em POST**
> Cria um script que faz `POST /products` na Tray com body = { name: 'Tênis', price: 199 } (JSON cru, sem wrapping).

Esperado: após `Write`, hook alerta sobre ausência da chave-envelope `{"Product": {...}}`.

**7B — Bash**

**7.3 — HTTP 401 (token inválido/expirado)**
> Roda este curl: `curl -i 'https://abc.commercesuite.com.br/products?access_token=invalid'` e me explica o resultado.

Esperado: hook detecta HTTP 401 + chamada à Tray, orienta sobre renovar via `refresh_token`.

**7.4 — HTTP 429 (rate limit)**
> Roda um loop com 200 requisições para `GET /products` da minha loja Tray e me mostra o que aconteceu nas últimas 20 respostas.

Esperado: hook detecta HTTP 429 + chamada à Tray, sugere backoff exponencial e cita os limites (180 req/min, 10.000 req/dia).

**7.5 — HTTP 400 (campo obrigatório / formato inválido)**
> Roda este curl para criar um produto na Tray: `curl -X POST 'https://abc.commercesuite.com.br/products?access_token=TOKEN' -d '{"Product": {"price": 99}}'` e mostra o resultado.

Esperado: hook detecta HTTP 400 com mensagem sobre `name` obrigatório, sugere `skills/produtos/scripts/validate.mjs` antes da próxima tentativa.

**7.6 — HTTP 404 (URL base errada / `api_address` incorreto)**
> Roda este curl: `curl -i 'https://api.tray.com.br/products?access_token=TOKEN'` (sem usar o api_address da loja, usei o domínio público) e me explica o erro.

Esperado: hook detecta HTTP 404 + chamada a domínio Tray, orienta que `{api_address}` é específico por loja e retornado no callback OAuth.

**7.7 — Bash sem chamada à Tray (regressão)**
> Roda `ls -la` no diretório atual e me mostra o que tem aqui.

Esperado: hook **NÃO** responde. Saída de `ls` não tem chamada à API Tray nem código HTTP da Tray.

### Bloco 8 — Smoke test ferramentas secundárias — 4 cenários

**8.1 — Gemini CLI**
> Como faço autenticação na API Tray?

Esperado: `GEMINI.md` carregado automaticamente; resposta menciona OAuth 2.0 de 3 etapas.

**8.2 — GitHub Copilot (VS Code)**
> Em um arquivo TypeScript, escrever o comentário `// Função para autenticar na API Tray via OAuth` e aceitar a sugestão do Copilot.

Esperado: sugestão do Copilot referencia `consumer_key`/`consumer_secret`/`code` (sinal de que `.github/copilot-instructions.md` foi consumido).

**8.3 — JetBrains AI Assistant**
> Como faço autenticação na API Tray?

Esperado: `.aiassistant/rules/tray-api.md` é detectado; resposta menciona OAuth de 3 etapas.

**8.4 — Windsurf (Cascade)**
> Como faço autenticação na API Tray?

Esperado: rule do Cascade é detectado; resposta menciona OAuth de 3 etapas.

---

## Próximos passos (robustez futura)

A v1 cobre o suficiente para validar as mudanças da branch atual. Para uma v2, listamos cenários extras já mapeados:

**OAuth e auth**

- Erros 1099 e 1000–1003 (estados específicos da loja).
- Renovação proativa (margem ≤ 2h30 antes da expiração de 3h).

**Rate limit / robustez de rede**

- Curva de backoff exponencial em 429 (1s, 2s, 4s, 8s).
- Operação em lote: 150 itens/batch + pausa de 60s entre batches.
- Paginação com `pager.total > 50`.

**Regras BR**

- CNPJ malformado.
- CEP malformado.
- NCM com 7 dígitos / EAN sem dígito verificador.
- Datas em `DD/MM/YYYY` (errado) vs `YYYY-MM-DD`.

**Skills sem schema (29 restantes)**

- Multi-CD, kits compostos, listas de preço B2B, cupons, notas fiscais, etc.

**Regressão / negativa**

- Pedido fora do escopo das skills (recurso inexistente).
- Ambiguidade entre 2 skills (`pedidos` vs `status-pedido`, `clientes` vs `enderecos-cliente`).

---

## Tratamento de erros do próprio documento

| Cenário | Comportamento esperado |
|:--|:--|
| Testador não tem o plugin instalado | Pré-requisitos da seção "Como usar" deixam isso explícito; checklist falha cedo. |
| Ferramenta esconde tool calls | Cada critério em "Como verificar" tem fallback de inferência (segundo turno, busca textual). |
| IA responde em outro idioma | Independente do idioma, expectativas são em PT-BR (skills, endpoints, palavras-chave) — testador ainda consegue avaliar. |
| Cenário tem comportamento ambíguo | Coluna "Observações" do cenário absorve a nuance; checklist mantém só itens binários. |

---

## Testes do próprio entregável

A v1 é manual; não há test runner. Verificação de qualidade do documento:

1. **Smoke estrutural** — todos os 32 cenários seguem o template-card; todos os links internos para `#como-verificar-em-cada-ferramenta` resolvem; nenhum prompt está vazio.
2. **Coerência de IDs** — IDs estáveis e contíguos por bloco (`1.1` a `1.5`, `2.1` a `2.4`, etc.).
3. **Consistência com `hooks/hooks.json`** — cenários de hook refletem o estado atual do JSON (3 hooks, 4 códigos HTTP em Bash, matcher revisado).
4. **Consistência com as 5 skills com schema** — cenários 3.1 e 3.3 trigam o `validate.mjs` (skills `produtos` e `webhooks`); cenário 3.2 testa regra BR do `AGENTS.md` complementar ao `validate.mjs`.

---

## Fora do escopo

- Test runner automatizado (CLI / GitHub Action).
- Cenários para 4 das 7 ferramentas (cobertura total).
- Cobertura das 29 skills sem schema.
- Geração automática de relatórios em CSV/JSON.
- Captura de transcript / screenshot.

---

## Critérios de aceite

A v1 do `docs/CENARIOS-DE-TESTE.md` está pronta quando:

1. Os 32 cenários estão escritos no formato do template-card.
2. A seção "Como verificar em cada ferramenta" cobre os 7 critérios com instruções para CC, Cursor e Codex (mais N/A para hooks fora de CC/Cursor).
3. Existe TOC clicável no topo do documento (links para cada bloco).
4. Existe a seção "Próximos passos (robustez futura)" listando os cenários da v2.
5. O documento foi commitado na branch `feat/skill-validation-and-disambiguation`.
