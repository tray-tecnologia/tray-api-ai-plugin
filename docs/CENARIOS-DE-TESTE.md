# Cenários de Teste — Tray API Plugin

> Documento para validar manualmente as melhorias da branch
> `feat/skill-validation-and-disambiguation`: validação executável de payload,
> seleção correta de skill (`when_not_to_use`), seguimento da seção
> "Antes de responder" e correção dos hooks.
>
> Cobertura completa em **Claude Code**, **Cursor** e **OpenAI Codex CLI**.
> Smoke test em Gemini CLI, GitHub Copilot, JetBrains AI Assistant e Windsurf.

## Sumário

- [Como usar este documento](#como-usar-este-documento)
- [Como verificar em cada ferramenta](#como-verificar-em-cada-ferramenta)
- [Bloco 1 — Geração de código (positivos legítimos)](#bloco-1--geração-de-código-positivos-legítimos)
- [Bloco 2 — Disambiguação (`when_not_to_use`)](#bloco-2--disambiguação-when_not_to_use)
- [Bloco 3 — Validação de payload (`validate.mjs` + regras BR)](#bloco-3--validação-de-payload-validatemjs--regras-br)
- [Bloco 4 — Hooks: falsos positivos](#bloco-4--hooks-falsos-positivos)
- [Bloco 5 — Hooks: positivos legítimos](#bloco-5--hooks-positivos-legítimos)
- [Bloco 6 — Hooks: regressão (nunca interrompe)](#bloco-6--hooks-regressão-nunca-interrompe)
- [Bloco 7 — `PostToolUse` (Write/Edit/Bash)](#bloco-7--posttooluse-writeeditbash)
- [Bloco 8 — Smoke test ferramentas secundárias](#bloco-8--smoke-test-ferramentas-secundárias)
- [Próximos passos (robustez futura)](#próximos-passos-robustez-futura)

## Como usar este documento

### Pré-requisitos

- O plugin Tray API está instalado na ferramenta que será testada:
  - **Claude Code** — plugin instalado via `/plugin install` ou clone local; `/reload-plugins` mostrou `34 skills · 5 agents · 3 hooks`.
  - **Cursor** — `.cursor/rules/tray-api.mdc` presente no repositório de teste.
  - **Codex CLI** — `AGENTS.md` presente na raiz do repositório de teste.
- Para os cenários de hook (Blocos 4–7), só Claude Code e Cursor são aplicáveis: as outras ferramentas não consomem `hooks/hooks.json`.

### Fluxo

1. Escolher um cenário (ex: `1.1`).
2. Abrir a ferramenta a testar.
3. Copiar o **Prompt (copy-paste)** literal e colar na ferramenta.
4. Observar a resposta da IA.
5. Marcar cada item do **Checklist de verificação** com `[x]` (passou), `[!]` (falhou) ou deixar `[ ]` (não testado).
6. Anotar qualquer nuance no campo **Observações**.
7. Repetir o cenário em outra ferramenta, se aplicável.

### Convenções

- **IDs `N.M`** — `N` é o bloco, `M` é o cenário dentro do bloco. Estáveis: nunca renumeramos um cenário antigo, apenas adicionamos novos.
- **Checklist** — `[ ]` não testado, `[x]` passou, `[!]` falhou.
- **"Aplicável a"** no cabeçalho do cenário lista as ferramentas em que ele faz sentido. Cenários sem essa linha valem para todas.

## Como verificar em cada ferramenta

> Esta seção é referenciada pelo checklist de **todos** os cenários abaixo. Aqui descrevemos, para cada critério, como confirmar o que aconteceu em cada ferramenta + um *fallback* quando o sinal não é direto.

### Skill selecionada

- **Claude Code** — no turn da resposta, expandir o painel **Tool uses** / **Tools**: cada skill carregada aparece como `Skill(tray-<recurso>)`. *Fallback:* procurar no texto da resposta menções literais a `skills/<recurso>/SKILL.md` ou ao nome `tray-<recurso>`.
- **Cursor** — no painel do chat, ao final da mensagem da IA, abrir **Context** / **Used files**. Devem aparecer arquivos `skills/<recurso>/SKILL.md` ou `.cursor/rules/tray-api.mdc`. *Fallback:* segundo turno *"quais SKILL.md você consultou para responder?"*.
- **Codex CLI** — sem UI rica. No transcript, procurar menções a `skills/<recurso>/SKILL.md` ou ao `name` da skill. *Fallback:* segundo turno *"qual skill (arquivo SKILL.md) você utilizou?"*.

### "Antes de responder" foi seguida

Verificação por **inferência da resposta** (não há sinal direto). Os 4 passos comuns devem ter evidência implícita no código gerado:

1. Método HTTP e endpoint corretos
2. Todos os campos obrigatórios listados na skill aparecem no payload
3. Tokens/secrets via env vars (não literais)
4. A skill escolhida bate com `when_to_use` / `when_not_to_use`

O **passo 5** (apenas nas 5 skills com schema: `produtos`, `pedidos`, `autorizacao`, `webhooks`, `clientes`) é validado em **`validate.mjs` foi executado** abaixo.

### Hook `UserPromptSubmit` disparou *(apenas Claude Code e Cursor)*

- **Claude Code** — turn da resposta → expandir **System** / **Hooks** → texto começando com *"IMPORTANTE: Este contexto é APENAS informativo…"*. *Fallback CLI:* rodar com `claude --debug` e procurar `UserPromptSubmit` no log.
- **Cursor** — painel de contexto da mensagem (seção *Additional context*). *Fallback:* segundo turno *"você recebeu algum aviso/contexto adicional sobre OAuth ou rate limit antes de responder?"*. Se sim, hook disparou.
- **Codex / Gemini / Copilot / JetBrains / Windsurf** — N/A, não consomem `hooks/hooks.json`.

### `validate.mjs` foi executado

- **Claude Code** — painel **Tool uses** mostra uma `Bash` tool call:
  ```
  node skills/<recurso>/scripts/validate.mjs '<payload>'
  ```
  Output esperado: `✅ Payload válido — pode prosseguir.` ou `❌ Validação falhou — N erros: …`.
- **Cursor** — painel de terminal/shell tools mostra a mesma chamada.
- **Codex CLI** — no transcript da sessão, procurar `node skills/.../validate.mjs`.

### Hook `PostToolUse` disparou *(apenas Claude Code e Cursor)*

- **Claude Code** — após `Write|Edit|Bash`, mensagem extra (sistema ou continuação da IA) com aviso. Texto típico inclui:
  - "access_token… variáveis de ambiente" (token hardcoded)
  - "Product/Order/Customer… chave do recurso" (chave-envelope ausente)
  - "skills/<recurso>/scripts/validate.mjs" (sugestão de validador)
  - "HTTP 401/429/400/404" (diagnóstico de Bash)
- **Cursor** — comportamento equivalente; verificar texto após o tool call.

### Sem credenciais hardcoded no código gerado

Buscar no código gerado por:

- Strings longas que pareçam token (>20 caracteres alfanuméricos em literal)
- Atribuições do tipo `access_token = "..."`, `consumer_key = "..."`, `consumer_secret = "..."`

Esperado: uso de `process.env.TRAY_ACCESS_TOKEN` (ou equivalente da linguagem).

### Endpoint correto para a operação

Conferir que a URL gerada bate com a skill correspondente:

| Skill | Endpoints |
|:--|:--|
| `tray-autorizacao` | `POST {api_address}/auth`, `GET {api_address}/auth?refresh_token=…` |
| `tray-produtos` | `GET/POST/PUT/DELETE {api_address}/products` |
| `tray-pedidos` | `GET/POST/PUT {api_address}/orders` |
| `tray-clientes` | `GET/POST/PUT {api_address}/customers` |
| `tray-webhooks` | listener no seu próprio servidor (Tray ativa por ticket) |

`access_token` deve estar como **query parameter**, nunca em header.
## Bloco 1 — Geração de código (positivos legítimos)

> Testa que a IA seleciona as skills certas, segue a seção "Antes de responder" e executa `validate.mjs` quando aplicável.

### 1.1 — Login + listar produtos

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 1 — Geração de código (positivos legítimos)
**O que valida:** seleção combinada de `tray-autorizacao` + `tray-produtos`, fluxo OAuth completo, uso de env vars e execução do `validate.mjs` no payload de `POST /auth`.

#### Prompt (copy-paste)

> Crie um sistema simples que faça login na minha loja Tray usando OAuth e liste os produtos cadastrados. Mostre apenas nome, preço e estoque.

#### Resultado esperado

A IA deve:

1. Identificar e usar as skills `tray-autorizacao` (etapa 3 do OAuth, `POST /auth`) e `tray-produtos` (`GET /products`).
2. Não emitir `access_token`/`consumer_key`/`consumer_secret` como literais — usar env vars.
3. Usar `?access_token={token}` como query parameter em `GET /products`.
4. Executar `node skills/autorizacao/scripts/validate.mjs '<payload>'` no payload de troca de código por token.

#### Checklist de verificação

> `[x]` passou · `[!]` falhou · `[ ]` não testado · veja [Como verificar em cada ferramenta](#como-verificar-em-cada-ferramenta).

- [ ] **Skills selecionadas:** apareceram `tray-autorizacao` E `tray-produtos`
- [ ] **"Antes de responder" seguida:** os 4 passos (ou 5 com `validate.mjs`) refletidos no código
- [ ] **Endpoints corretos:** `POST {api_address}/auth` (etapa 3) + `GET {api_address}/products?access_token=…`
- [ ] **Sem credenciais hardcoded:** uso de `process.env.TRAY_*` ou equivalente
- [ ] **`validate.mjs` executado:** `skills/autorizacao/scripts/validate.mjs` rodou no payload de `POST /auth`
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*: contexto OAuth foi injetado
- [ ] **Hook não interrompeu a operação:** resposta foi entregue normalmente

#### Observações

```
(anote nuances por ferramenta: o que a IA fez de diferente, o que faltou, etc.)
```

---

### 1.2 — Criar produto simples

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 1 — Geração de código (positivos legítimos)
**O que valida:** uso de `tray-produtos`, payload envelopado em `{"Product": {...}}`, presença dos campos obrigatórios `name` e `price`, e `validate.mjs` aprovando.

#### Prompt (copy-paste)

> Cadastra um produto novo na minha loja Tray com nome 'Camiseta Básica', preço 49.90 e estoque 100.

#### Resultado esperado

A IA deve:

1. Usar `tray-produtos` e o endpoint `POST {api_address}/products?access_token=…`.
2. Envelopar o body em `{"Product": {...}}`.
3. Incluir os campos obrigatórios `name` e `price` (e `stock` ou variação como informação extra).
4. Rodar `node skills/produtos/scripts/validate.mjs '{"Product": {"name":"Camiseta Básica","price":"49.90"}}'` e o validador aprovar.

#### Checklist de verificação

- [ ] **Skill selecionada:** `tray-produtos`
- [ ] **"Antes de responder" seguida:** payload tem `name` e `price`, sem credenciais literais
- [ ] **Chave-envelope:** body envolto em `{"Product": {...}}`
- [ ] **Endpoint correto:** `POST {api_address}/products?access_token=…`
- [ ] **`validate.mjs` executado e aprovado:** saída `✅ Payload válido`
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*: contexto OAuth foi injetado (gatilho `/products`)
- [ ] **Hook não interrompeu:** resposta foi entregue normalmente

#### Observações

```
```

---

### 1.3 — Listar pedidos do dia

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 1 — Geração de código (positivos legítimos)
**O que valida:** uso de `tray-pedidos` (e `tray-autorizacao` se OAuth não estiver pronto), filtro de data no formato `YYYY-MM-DD`, paginação com `limit ≤ 50`.

#### Prompt (copy-paste)

> Preciso de um script que liste todos os pedidos da minha loja Tray feitos hoje, mostrando id, cliente e valor total.

#### Resultado esperado

A IA deve:

1. Usar `tray-pedidos` e o endpoint `GET {api_address}/orders?access_token=…`.
2. Aplicar filtro de data no formato `YYYY-MM-DD` (campo típico: `date`).
3. Iterar via paginação (`limit ≤ 50` por página, usando `pager.total` para saber quando parar).
4. Não hardcodar credenciais.

#### Checklist de verificação

- [ ] **Skill selecionada:** `tray-pedidos` (e `tray-autorizacao` se OAuth não estiver pronto)
- [ ] **"Antes de responder" seguida:** método e endpoint corretos
- [ ] **Filtro de data:** `YYYY-MM-DD`, não `DD/MM/YYYY`
- [ ] **Paginação:** `limit ≤ 50`, loop com `pager.total`
- [ ] **Endpoint correto:** `GET {api_address}/orders?access_token=…`
- [ ] **Sem credenciais hardcoded**
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*: gatilho `/orders`
- [ ] **Hook não interrompeu**

#### Observações

```
```

---

### 1.4 — Cadastrar cliente B2C

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 1 — Geração de código (positivos legítimos)
**O que valida:** uso de `tray-clientes`, payload envelopado em `{"Customer": {...}}`, CPF normalizado para 11 dígitos, `validate.mjs` aprovando.

#### Prompt (copy-paste)

> Cria um cliente novo na minha Tray: nome 'João Silva', email 'joao@exemplo.com', CPF '529.982.247-25'.

#### Resultado esperado

A IA deve:

1. Usar `tray-clientes` e o endpoint `POST {api_address}/customers?access_token=…`.
2. Envelopar body em `{"Customer": {...}}`.
3. Normalizar CPF para 11 dígitos puros (remover pontos e traço): `52998224725`.
4. Rodar `node skills/clientes/scripts/validate.mjs '<payload>'` — validador aprova (campos `name` e `email` presentes).

#### Checklist de verificação

- [ ] **Skill selecionada:** `tray-clientes`
- [ ] **"Antes de responder" seguida**
- [ ] **Chave-envelope:** body envolto em `{"Customer": {...}}`
- [ ] **CPF normalizado:** 11 dígitos, sem pontuação
- [ ] **Endpoint correto:** `POST {api_address}/customers?access_token=…`
- [ ] **`validate.mjs` executado e aprovado**
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*: gatilho `/customers`
- [ ] **Hook não interrompeu**

#### Observações

```
```

---

### 1.5 — Listener de webhook de pedidos

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 1 — Geração de código (positivos legítimos)
**O que valida:** uso de `tray-webhooks`, geração de listener HTTP, parse de payload `application/x-www-form-urlencoded`, e que a IA mencione que ativação na Tray é por ticket de suporte (não via API).

#### Prompt (copy-paste)

> Crie um endpoint Express que receba webhooks da Tray e processe eventos de pedidos novos (scope_name=order, act=insert). Inclua validação dos campos recebidos.

#### Resultado esperado

A IA deve:

1. Usar `tray-webhooks` e gerar um listener Express com `app.post('/webhooks/tray', ...)`.
2. Parsear `application/x-www-form-urlencoded` (`express.urlencoded({ extended: true })`).
3. Processar os campos `seller_id`, `scope_id`, `scope_name`, `act` (filtrando `scope_name === 'order' && act === 'insert'`).
4. Rodar `node skills/webhooks/scripts/validate.mjs '<payload-de-exemplo>'` — validador aprova um payload completo.
5. Mencionar que **ativação do webhook na Tray é via ticket de suporte**, não via API.

#### Checklist de verificação

- [ ] **Skill selecionada:** `tray-webhooks`
- [ ] **"Antes de responder" seguida**
- [ ] **Listener correto:** parse de `x-www-form-urlencoded`, leitura de `seller_id`/`scope_id`/`scope_name`/`act`
- [ ] **`validate.mjs` executado e aprovado em payload de exemplo**
- [ ] **Menção a ativação por ticket de suporte**
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*: gatilho `api.*tray`
- [ ] **Hook não interrompeu**

#### Observações

```
```
