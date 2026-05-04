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
- [Bloco 9 — `validate.mjs` v2 (CLI e output)](#bloco-9--validatemjs-v2-cli-e-output)
- [Bloco 10 — Formats BR detectados pelo schema](#bloco-10--formats-br-detectados-pelo-schema)
- [Bloco 11 — Skills novas com `validate.mjs`](#bloco-11--skills-novas-com-validatemjs)
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
- [ ] **`validate.mjs --schema=<op>` executado:** com a flag explícita para o schema correto da operação
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
- [ ] **`validate.mjs --schema=<op>` executado:** com a flag explícita para o schema correto da operação
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
- [ ] **`validate.mjs --schema=<op>` executado:** com a flag explícita para o schema correto da operação
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
- [ ] **`validate.mjs --schema=<op>` executado:** com a flag explícita para o schema correto da operação
- [ ] **Menção a ativação por ticket de suporte**
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*: gatilho `api.*tray`
- [ ] **Hook não interrompeu**

#### Observações

```
```
## Bloco 2 — Disambiguação (`when_not_to_use`)

> Testa que, em prompts ambíguos, a IA escolhe a skill correta consultando o campo `when_not_to_use` no frontmatter.

### 2.1 — Cores de produto

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 2 — Disambiguação
**O que valida:** ao mencionar variação de cor, a IA escolhe `tray-variacoes`, **não** `tray-produtos` (mesmo o prompt mencionando "produto").

#### Prompt (copy-paste)

> Como adiciono variações de cor (azul, vermelho, preto) ao produto 'Camiseta Básica' na minha loja Tray?

#### Resultado esperado

A IA deve:

1. Usar `tray-variacoes`, **não** `tray-produtos`.
2. Citar o endpoint `POST {api_address}/products/{id}/variants?access_token=…`.
3. Mostrar payload com campos típicos de variação (cor, tamanho, estoque por variação).

#### Checklist de verificação

- [ ] **Skill correta:** `tray-variacoes` (não `tray-produtos`)
- [ ] **Endpoint correto:** `/products/{id}/variants`
- [ ] **`when_not_to_use` foi respeitado:** a IA não tentou criar/editar o produto-pai
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*: gatilho `tray-api`/`/products`
- [ ] **Hook não interrompeu**

#### Observações

```
```

---

### 2.2 — Fotos do produto

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 2 — Disambiguação
**O que valida:** ao mencionar fotos/imagens, a IA escolhe `tray-imagens-produtos`, **não** `tray-produtos`.

#### Prompt (copy-paste)

> Quero adicionar 5 fotos ao produto 'Camiseta Básica' da minha Tray. As fotos estão em URLs públicas.

#### Resultado esperado

A IA deve:

1. Usar `tray-imagens-produtos`, **não** `tray-produtos`.
2. Citar o endpoint `POST {api_address}/products/{id}/images?access_token=…`.
3. Mostrar payload com URL e ordenação.

#### Checklist de verificação

- [ ] **Skill correta:** `tray-imagens-produtos` (não `tray-produtos`)
- [ ] **Endpoint correto:** `/products/{id}/images`
- [ ] **`when_not_to_use` foi respeitado**
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*
- [ ] **Hook não interrompeu**

#### Observações

```
```

---

### 2.3 — Combo de produtos

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 2 — Disambiguação
**O que valida:** ao pedir "combo", a IA escolhe `tray-kits`, **não** `tray-produtos`.

#### Prompt (copy-paste)

> Quero criar um combo na minha loja Tray: 1 camiseta + 1 calça por 99.90 com desconto.

#### Resultado esperado

A IA deve:

1. Usar `tray-kits`, **não** `tray-produtos`.
2. Citar o endpoint `POST {api_address}/kits?access_token=…`.
3. Listar os produtos componentes e o preço do kit.

#### Checklist de verificação

- [ ] **Skill correta:** `tray-kits` (não `tray-produtos`)
- [ ] **Endpoint correto:** `/kits`
- [ ] **`when_not_to_use` foi respeitado**
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*
- [ ] **Hook não interrompeu**

#### Observações

```
```

---

### 2.4 — Categorizar produtos

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 2 — Disambiguação
**O que valida:** ao pedir categorização, a IA escolhe `tray-categorias`, **não** `tray-produtos`.

#### Prompt (copy-paste)

> Como organizo os produtos da minha loja Tray em categorias (Masculino, Feminino, Infantil)?

#### Resultado esperado

A IA deve:

1. Usar `tray-categorias`, **não** `tray-produtos`.
2. Citar o endpoint `POST {api_address}/categories?access_token=…`.
3. Mostrar como vincular produto a categoria via `category_id`.

#### Checklist de verificação

- [ ] **Skill correta:** `tray-categorias` (não `tray-produtos`)
- [ ] **Endpoint correto:** `/categories`
- [ ] **`when_not_to_use` foi respeitado**
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*
- [ ] **Hook não interrompeu**

#### Observações

```
```
## Bloco 3 — Validação de payload (`validate.mjs` + regras BR)

> Mistura proposital: 3.1 e 3.3 testam o `validate.mjs` rejeitando campos `required` faltantes; 3.2 testa CPF malformado rejeitado pelo schema `cliente.create` com `format: cpf` (1.3.0).

### 3.1 — Produto sem campo obrigatório

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 3 — Validação de payload
**O que valida:** o `validate.mjs` rejeita payload sem `name` e a IA corrige antes de devolver código (não devolve código quebrado).

#### Prompt (copy-paste)

> Cria um produto na minha Tray apenas com o preço 99.90, sem nome (vou definir depois).

#### Resultado esperado

A IA deve:

1. Usar `tray-produtos`.
2. Tentar `validate.mjs` com `{"Product": {"price":"99.90"}}` — saída: `❌ Validação falhou — 1 erro: "name" é obrigatório mas está ausente.`

> **Nota 1.3.0:** se a IA rodar com `--json`, a saída será JSON
> estruturado (`{valid:false, errors:[{path:"/Product/name", keyword:"required"...}]}`).
> Verificar Bloco 9.1.

3. **Não** entregar código pronto. Em vez disso, alertar o usuário: "o nome é obrigatório; me passe um nome para eu cadastrar o produto" (ou colocar um placeholder evidente como `name: '<NOME OBRIGATÓRIO>'` e marcar para preenchimento).

#### Checklist de verificação

- [ ] **Skill selecionada:** `tray-produtos`
- [ ] **`validate.mjs --schema=<op>` executado:** com a flag explícita para o schema correto da operação
- [ ] **`validate.mjs` rejeitou:** sim, com mensagem sobre `name`
- [ ] **IA corrigiu/alertou:** não entregou código que estouraria HTTP 400
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*: gatilho `tray-api`
- [ ] **Hook não interrompeu**

#### Observações

```
```

---

### 3.2 — Cliente com CPF malformado

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 3 — Validação de payload
**O que valida:** Em 1.3.0 o schema `cliente.create` ganha `format: cpf` —
o `validate.mjs` agora **rejeita** CPF malformado pelo schema, não apenas
pelo `AGENTS.md`. Cenário renomeado para refletir comportamento alterado.
ID `3.2` mantido (estável; nunca renumeramos cenários antigos).

#### Prompt (copy-paste)

> Cadastra um cliente na Tray: nome 'Maria', email 'maria@x.com', CPF '111'.

#### Resultado esperado

A IA deve:

1. Usar `tray-clientes`.
2. Rodar `node skills/clientes/scripts/validate.mjs --schema=cliente.create '{"Customer":{"name":"Maria","email":"maria@x.com","cpf":"111"}}'`.
3. Saída: `❌ Validação falhou — 1 erro: CPF inválido — algoritmo de verificação falhou. Use 11 dígitos numéricos com DV correto.`
4. Não enviar à API. Pedir CPF correto ao usuário.

#### Checklist de verificação

- [ ] **Skill selecionada:** `tray-clientes`
- [ ] **`validate.mjs --schema=cliente.create` executado**
- [ ] **`validate.mjs` rejeitou pelo `format: cpf`** (mensagem menciona "CPF inválido" / "algoritmo de verificação")
- [ ] **A IA não enviou à API** (regressão do comportamento anterior, em que `validate` aprovava o payload)
- [ ] **A IA pediu CPF correto ao usuário**
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*
- [ ] **Hook não interrompeu**

#### Observações

```
Comportamento alterado em 1.3.0. Antes: validate aceitava ('111' tinha
maxLength 14 e o algoritmo BR vinha do AGENTS.md). Depois: schema rejeita
diretamente pelo `format: cpf`.
```

---

### 3.3 — Webhook recebido sem campo `act`

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 3 — Validação de payload
**O que valida:** o `validate.mjs` de `webhooks` rejeita payload recebido sem `act` (campo obrigatório do schema), e a IA explica que o payload está malformado.

#### Prompt (copy-paste)

> Recebi este payload de webhook no meu listener da Tray: `{"seller_id": 100, "scope_id": 200, "scope_name": "order"}`. Como processo isso?

#### Resultado esperado

A IA deve:

1. Usar `tray-webhooks`.
2. Rodar `node skills/webhooks/scripts/validate.mjs '{"seller_id":100,"scope_id":200,"scope_name":"order"}'`.
3. Saída: `❌ Validação falhou — 1 erro: "act" é obrigatório mas está ausente.`
4. Explicar que `act` é obrigatório (`insert`, `update`, `delete`) e que o payload está incompleto/malformado — pode ser erro de envio ou de parsing.

#### Checklist de verificação

- [ ] **Skill selecionada:** `tray-webhooks`
- [ ] **`validate.mjs` executado**
- [ ] **`validate.mjs` rejeitou por `act` ausente**
- [ ] **IA explicou o erro:** mencionou `insert`/`update`/`delete`
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*: gatilho `api.*tray`
- [ ] **Hook não interrompeu**

#### Observações

```
```
## Bloco 4 — Hooks: falsos positivos

> *Aplicável apenas a Claude Code e Cursor.* Testa que o hook `UserPromptSubmit` **NÃO** dispara em prompts que mencionam "tray" mas não têm relação com a API Tray. O matcher antigo (`tray|Tray|TRAY`) disparava nesses casos; o novo (`api.*tray|tray.*api|api_address|...`) não.

### 4.1 — Ícone base64 para meu app

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 4 — Hooks: falsos positivos
**O que valida:** sem qualquer menção a "tray", o hook não dispara.

#### Prompt (copy-paste)

> Crie um ícone em base64 para o meu app.

#### Resultado esperado

1. Hook `UserPromptSubmit` **NÃO** dispara — não há nenhuma das palavras-chave do matcher.
2. A IA responde com um SVG/PNG em base64, sem injeção de contexto da Tray.

#### Checklist de verificação

- [ ] **Hook NÃO disparou:** painel "System"/"Hooks" ou "Additional context" vazio para este prompt
- [ ] **Resposta sem contexto da Tray:** nenhuma menção a OAuth, `access_token`, `api_address`
- [ ] **A IA respondeu o que foi pedido:** ícone base64

#### Observações

```
```

---

### 4.2 — Ícone para projeto tray-api-claude-plugin

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 4 — Hooks: falsos positivos
**O que valida:** "tray" como nome de projeto **não** dispara o hook (regressão importante: matcher antigo disparava).

#### Prompt (copy-paste)

> Gere um ícone SVG simples para o projeto tray-api-claude-plugin.

#### Resultado esperado

1. Hook `UserPromptSubmit` **NÃO** dispara — "tray" aparece no nome do projeto, mas não há `api.*tray`/`tray.*api`/`api_address`/etc. correlacionado **na pergunta** (o nome do projeto contém "tray-api" mas como hífen e o regex usa `.*` então pode acabar disparando — registrar o resultado real).
2. A IA gera um SVG sem injeção de contexto.

> **Nota:** este cenário é um caso de borda. O matcher novo `api.*tray|tray.*api` pode disparar pelo trecho "tray-api" no nome do projeto. Se disparar, anotar nas observações — revisar matcher.

#### Checklist de verificação

- [ ] **Hook NÃO disparou** (resultado ideal)
- [ ] **Caso disparou:** anotar em "Observações" — pode ser caso de borda do matcher
- [ ] **Resposta sem contexto irrelevante da Tray**

#### Observações

```
```

---

### 4.3 — "Tray de comida" em CSS

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 4 — Hooks: falsos positivos
**O que valida:** "tray" como palavra comum (bandeja) **não** dispara o hook.

#### Prompt (copy-paste)

> Tenho um componente React de bandeja (tray) de comida. Como estilizo o background com CSS?

#### Resultado esperado

1. Hook `UserPromptSubmit` **NÃO** dispara — sem palavras-chave da API.
2. A IA responde sobre CSS, sem injeção da Tray.

#### Checklist de verificação

- [ ] **Hook NÃO disparou**
- [ ] **Resposta sem contexto da Tray**
- [ ] **A IA respondeu o que foi pedido:** CSS/styling

#### Observações

```
```

---

### 4.4 — Lib de UI chamada Tray

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 4 — Hooks: falsos positivos
**O que valida:** "Tray" como nome próprio de outra lib **não** dispara o hook.

#### Prompt (copy-paste)

> Existe uma lib de UI chamada Tray para mobile? Tem alternativa em React Native?

#### Resultado esperado

1. Hook `UserPromptSubmit` **NÃO** dispara — sem palavras-chave da API Tray.
2. A IA responde sobre libs de UI, sem injeção de contexto da Tray.

#### Checklist de verificação

- [ ] **Hook NÃO disparou**
- [ ] **Resposta sem contexto da API Tray**
- [ ] **A IA não confundiu com a plataforma de e-commerce**

#### Observações

```
```
## Bloco 5 — Hooks: positivos legítimos

> *Aplicável apenas a Claude Code e Cursor.* Testa que o hook `UserPromptSubmit` dispara em prompts legítimos da API Tray e injeta o contexto OAuth.

### 5.1 — Autenticação na API Tray

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 5 — Hooks: positivos legítimos
**O que valida:** o gatilho `api.*tray` (e/ou `access_token`/`refresh_token`) dispara.

#### Prompt (copy-paste)

> Como faço autenticação na API Tray? Preciso entender o fluxo de access_token e refresh_token.

#### Resultado esperado

1. Hook `UserPromptSubmit` **DISPARA** — match em `api.*tray`, `access_token` e `refresh_token` (qualquer um já basta — múltiplos garantem o disparo mesmo se o regex for case-sensitive).
2. Contexto da Tray injetado: aviso "APENAS informativo" + lembretes de OAuth, expiração, rate limit, URL base.
3. A IA responde sobre OAuth 2.0 de 3 etapas usando a skill `tray-autorizacao`.

#### Checklist de verificação

- [ ] **Hook disparou:** sim, contexto injetado
- [ ] **Texto do hook começa com "IMPORTANTE: Este contexto é APENAS informativo"**
- [ ] **Skill correta usada:** `tray-autorizacao`
- [ ] **A IA explicou o fluxo OAuth de 3 etapas**
- [ ] **Hook não interrompeu**

#### Observações

```
```

---

### 5.2 — Erro 401 com access_token

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 5 — Hooks: positivos legítimos
**O que valida:** o gatilho `access_token` dispara mesmo sem mencionar "Tray".

#### Prompt (copy-paste)

> Estou recebendo erro 401 toda vez que tento usar o access_token. O que pode ser?

#### Resultado esperado

1. Hook `UserPromptSubmit` **DISPARA** — match em `access_token`.
2. Contexto da Tray injetado.
3. A IA explica códigos `1000`–`1099` e sugere renovar via `refresh_token`.

#### Checklist de verificação

- [ ] **Hook disparou:** sim
- [ ] **A IA reconheceu o contexto Tray (mesmo sem o usuário mencionar)**
- [ ] **A IA explicou códigos 1000–1099 e renovação via refresh_token**
- [ ] **Hook não interrompeu**

#### Observações

```
```

---

### 5.3 — Configurar refresh_token

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 5 — Hooks: positivos legítimos
**O que valida:** o gatilho `refresh_token` dispara.

#### Prompt (copy-paste)

> Como configuro renovação automática do refresh_token na minha integração?

#### Resultado esperado

1. Hook `UserPromptSubmit` **DISPARA** — match em `refresh_token`.
2. A IA usa `tray-autorizacao` e explica `GET {api_address}/auth?refresh_token=…` + expiração de 30 dias do `refresh_token`.

#### Checklist de verificação

- [ ] **Hook disparou:** sim
- [ ] **Skill correta:** `tray-autorizacao`
- [ ] **Endpoint correto:** `GET {api_address}/auth?refresh_token=…`
- [ ] **Mencionou expiração de 30 dias**
- [ ] **Hook não interrompeu**

#### Observações

```
```
## Bloco 6 — Hooks: regressão (nunca interrompe)

> *Aplicável apenas a Claude Code e Cursor.* Testa que mesmo quando o hook `UserPromptSubmit` dispara, ele é APENAS informativo — nunca interrompe, bloqueia ou contamina respostas para pedidos não-Tray.

### 6.1 — Hook dispara mas pedido é não-Tray

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 6 — Hooks: regressão
**O que valida:** prompt com keyword da API Tray que pede explicitamente algo não-Tray. O `access_token` é deliberadamente incluído para garantir match (case-insensitive ou case-sensitive).

#### Prompt (copy-paste)

> Já usei a API Tray (com access_token) no passado, mas agora preciso aprender autenticação genérica em Express com Passport.js. Me explica do zero, sem mencionar Tray.

#### Resultado esperado

1. Hook `UserPromptSubmit` **DISPARA** (match em `access_token` no mínimo).
2. A IA **ignora** o contexto injetado (porque o usuário pediu explicitamente algo genérico) e responde sobre Express + Passport.js.
3. A resposta **não** menciona OAuth da Tray, `access_token`, `consumer_key` etc.

#### Checklist de verificação

- [ ] **Hook disparou** *(esperado)*
- [ ] **Resposta foca em Express + Passport.js**
- [ ] **Resposta NÃO menciona Tray, OAuth Tray, `access_token`, `consumer_key`**
- [ ] **Hook não interrompeu nem contaminou** *(esta é a regressão crítica)*

#### Observações

```
```

---

### 6.2 — Pedido principal não-Tray com menção tangencial

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 6 — Hooks: regressão
**O que valida:** prompt cujo objetivo principal é não-Tray, mas com menção tangencial a `/customers`.

#### Prompt (copy-paste)

> Crie uma função utilitária em JS que valide CPF. Ela vai ser usada num projeto que integra com /customers da Tray no futuro.

#### Resultado esperado

1. Hook `UserPromptSubmit` **DISPARA** (match em `/customers`).
2. A IA entrega **apenas** a função de validação de CPF (algoritmo dos dígitos verificadores), sem cadastrar cliente nem chamar `tray-clientes`.
3. A resposta menciona o uso futuro mas não desvia para implementação Tray.

#### Checklist de verificação

- [ ] **Hook disparou** *(esperado)*
- [ ] **A IA entregou apenas a função de validação de CPF**
- [ ] **A IA NÃO tentou cadastrar cliente na Tray**
- [ ] **A função aplica algoritmo dos dígitos verificadores** (não só `length === 11`)
- [ ] **Hook não interrompeu nem contaminou**

#### Observações

```
```
## Bloco 7 — `PostToolUse` e regressão de hooks

> *Aplicável apenas a Claude Code e Cursor.*
>
> **Mudança importante na 1.2.0:** o hook `PostToolUse:Bash` foi **removido**
> porque seu prompt entrava em conflito com o schema oficial
> (`{ok, reason}`) e disparava `hook stopped continuation` em comandos
> triviais como `ls`/`find`. Detalhes em
> `docs/ANALISE-HOOK-POSTTOOLUSE-BASH.md`.
>
> A orientação reativa que ele tentava prover (HTTP 401/429/400/404)
> agora chega **proativamente** via `UserPromptSubmit` (Bloco 5/6).
>
> Sub-grupo 7A continua testando `PostToolUse:Write|Edit`. Sub-grupo 7B
> agora valida o comportamento **migrado** e a regressão do bug.

### Sub-grupo 7A — `Write|Edit`

#### 7.1 — Tentar hardcodar access_token

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 7A — Write|Edit
**O que valida:** após gerar código com `access_token` literal, o hook alerta para usar env vars.

##### Prompt (copy-paste)

> Cria um arquivo `tray.js` que faça GET /products na minha loja Tray. Pode hardcodar o token por enquanto, depois eu refatoro.

##### Resultado esperado

1. A IA usa `Write` para criar `tray.js` (possivelmente com token literal, conforme pedido).
2. Após o `Write`, hook `PostToolUse` dispara e alerta:
   - "access_token… variáveis de ambiente"
3. A IA, na resposta seguinte, recomenda usar `process.env.TRAY_ACCESS_TOKEN`.

##### Checklist de verificação

- [ ] **`Write` foi executado**
- [ ] **Hook `PostToolUse` disparou** após o `Write`
- [ ] **Texto do alerta menciona "variáveis de ambiente"**
- [ ] **A IA, na resposta, sugeriu refatorar para env vars**

##### Observações

```
```

---

#### 7.2 — Falta da chave-envelope em POST

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 7A — Write|Edit
**O que valida:** após gerar código com body JSON sem a chave do recurso (`{"Product": {...}}`), o hook alerta.

##### Prompt (copy-paste)

> Cria um script que faz POST /products na Tray com body = { name: 'Tênis', price: 199 } (JSON cru, sem wrapping).

##### Resultado esperado

1. A IA pode tentar criar o script literal como pedido (body cru).
2. Após o `Write`, hook `PostToolUse` dispara e alerta sobre ausência da chave `{"Product": {...}}`.
3. A IA corrige (ou explica que precisa do envelope).

##### Checklist de verificação

- [ ] **`Write` foi executado**
- [ ] **Hook `PostToolUse` disparou** após o `Write`
- [ ] **Texto do alerta menciona chave-envelope (`{"Product": {...}}`, `{"Order": {...}}`, etc.)**
- [ ] **A IA corrigiu o body para incluir a chave-envelope**

##### Observações

```
```

---

#### 7.3 — URL fora do padrão `{api_address}`

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 7A — Write|Edit
**O que valida:** check (2) do hook `Write|Edit` — após gerar código que monta URL para um domínio Tray genérico (em vez do `{api_address}` específico da loja), o hook alerta.

##### Prompt (copy-paste)

> Cria um arquivo `tray-client.js` que faça `GET https://api.tray.com.br/products?access_token=TOKEN` e retorne os produtos. Pode usar fetch direto, sem helpers.

##### Resultado esperado

1. A IA usa `Write` para criar `tray-client.js` montando a URL com o domínio público `api.tray.com.br`.
2. Após o `Write`, hook `PostToolUse` dispara e alerta:
   - "URLs de endpoint da Tray fora do padrão `https://{api_address}/<recurso>?access_token={token}`"
3. A IA explica que `{api_address}` é específico por loja (vem do callback OAuth) e corrige.

##### Checklist de verificação

- [ ] **`Write` foi executado**
- [ ] **Hook `PostToolUse` disparou** após o `Write`
- [ ] **Texto do alerta menciona "fora do padrão" e/ou `{api_address}`**
- [ ] **A IA corrigiu para usar `{api_address}` parametrizado**

##### Observações

```
```

---

#### 7.4 — Falta sugestão de `validate.mjs` em recurso com schema

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 7A — Write|Edit
**O que valida:** check (4) do hook `Write|Edit` — após gerar código que monta payload para um recurso com `validate.mjs` (`produtos`/`pedidos`/`autorizacao`/`webhooks`/`clientes`), o hook sugere rodar o validador antes de testar contra a API real.

##### Prompt (copy-paste)

> Cria um arquivo `register-product.js` que monte o body para `POST /products` na Tray com `{"Product": {"name": "Tênis", "price": "199.90"}}` e faça a requisição. Não precisa rodar nem testar — só escrever o arquivo.

##### Resultado esperado

1. A IA usa `Write` para criar `register-product.js` com o body correto.
2. Após o `Write`, hook `PostToolUse` dispara e sugere:
   - "rodar `skills/produtos/scripts/validate.mjs` antes de testar contra a API real"
3. A IA pega o sugerido e roda o validador (ou explica como o usuário pode rodar).

##### Checklist de verificação

- [ ] **`Write` foi executado**
- [ ] **Hook `PostToolUse` disparou** após o `Write`
- [ ] **Texto do alerta sugere `skills/produtos/scripts/validate.mjs`**
- [ ] **A IA seguiu a sugestão (rodou o validador) ou explicou como rodá-lo**

##### Observações

```
```

---

### Sub-grupo 7B — Pós-Bash (orientação HTTP migrada para `UserPromptSubmit`)

> Na 1.2.0, o hook reativo de Bash foi removido. A orientação sobre erros
> HTTP da Tray (401/429/400/404) agora é entregue **proativamente** pelo
> `UserPromptSubmit` quando o usuário menciona Tray no prompt. Os cenários
> abaixo validam o comportamento migrado e a regressão do bug que motivou
> a mudança.

#### 7.5 — HTTP 401 (token inválido/expirado) — orientação proativa

**Aplicável a:** Claude Code · Cursor
**Bloco:** 7B — pós-Bash
**O que valida:** o `UserPromptSubmit` injeta orientação sobre HTTP 401, e a IA principal aplica corretamente quando vê o erro na saída de um `Bash`.

##### Prompt (copy-paste)

> Roda este curl na minha loja Tray: `curl -i 'https://abc.commercesuite.com.br/products?access_token=invalid'` e me explica o resultado.

##### Resultado esperado

1. `UserPromptSubmit` casa (menciona "loja Tray") e injeta o contexto com a orientação HTTP 401.
2. A IA executa o `curl` via `Bash`; saída tem `HTTP/1.1 401`.
3. **Sem nenhum hook reativo intermediário,** a IA — já munida do contexto do `UserPromptSubmit` — reconhece o 401 e explica:
   - "`access_token` expirado/inválido"
   - "renovar via `GET https://{api_address}/auth?refresh_token={token}`"

##### Checklist de verificação

- [ ] **`Bash` foi executado e retornou HTTP 401**
- [ ] **NENHUM `hook stopped continuation` apareceu** *(regressão do bug do `PostToolUse:Bash`)*
- [ ] **A IA mencionou `refresh_token` e renovação**
- [ ] **A IA explicou ao usuário a causa e a solução**

##### Observações

```
```

---

#### 7.6 — HTTP 429 (rate limit) — orientação proativa

**Aplicável a:** Claude Code · Cursor
**Bloco:** 7B — pós-Bash
**O que valida:** orientação de `UserPromptSubmit` sobre rate limit (180 req/min, 10.000 req/dia, backoff) chega à IA principal e é aplicada quando ela vê HTTP 429.

##### Prompt (copy-paste)

> Roda um loop com 200 requisições para GET /products da minha loja Tray e me mostra o que aconteceu nas últimas 20 respostas.

##### Resultado esperado

1. `UserPromptSubmit` casa e injeta o contexto.
2. A IA executa um loop via `Bash`; algumas respostas voltam HTTP 429.
3. A IA, com o contexto, propõe ou implementa backoff exponencial e/ou agrupamento em lotes.

##### Checklist de verificação

- [ ] **`Bash` foi executado e ao menos uma resposta foi HTTP 429**
- [ ] **NENHUM `hook stopped continuation` apareceu**
- [ ] **A IA propôs backoff exponencial** *(ou agrupamento em lotes)*
- [ ] **A IA mencionou os limites (180 req/min, 10.000 req/dia)**

##### Observações

```
```

---

#### 7.7 — HTTP 400 (campo obrigatório / formato inválido) — orientação proativa

**Aplicável a:** Claude Code · Cursor
**Bloco:** 7B — pós-Bash
**O que valida:** orientação do `UserPromptSubmit` sobre `validate.mjs` chega à IA, que sugere/roda o validador local antes de tentar a API novamente.

##### Prompt (copy-paste)

> Roda este curl para criar um produto na Tray: `curl -X POST 'https://abc.commercesuite.com.br/products?access_token=TOKEN' -d '{"Product": {"price": 99}}'` e mostra o resultado.

##### Resultado esperado

1. `UserPromptSubmit` casa e injeta o contexto.
2. A IA executa o `curl`; saída: HTTP 400 com mensagem sobre `name` obrigatório.
3. A IA sugere — ou executa — `skills/produtos/scripts/validate.mjs` localmente, identifica o campo faltando e corrige.

##### Checklist de verificação

- [ ] **`Bash` foi executado e retornou HTTP 400**
- [ ] **NENHUM `hook stopped continuation` apareceu**
- [ ] **A IA mencionou ou executou `validate.mjs`**
- [ ] **A IA identificou o campo faltando antes de tentar de novo**

##### Observações

```
```

---

#### 7.8 — HTTP 404 (URL base errada / `api_address` incorreto) — orientação proativa

**Aplicável a:** Claude Code · Cursor
**Bloco:** 7B — pós-Bash
**O que valida:** orientação do `UserPromptSubmit` sobre `api_address` específico por loja chega à IA principal.

##### Prompt (copy-paste)

> Roda este curl: `curl -i 'https://api.tray.com.br/products?access_token=TOKEN'` (sem usar o api_address da loja, usei o domínio público) e me explica o erro.

##### Resultado esperado

1. `UserPromptSubmit` casa e injeta o contexto.
2. A IA executa o `curl`; saída: HTTP 404 ou similar.
3. A IA explica que `{api_address}` é específico por loja, retornado no callback OAuth.

##### Checklist de verificação

- [ ] **`Bash` foi executado e retornou HTTP 404**
- [ ] **NENHUM `hook stopped continuation` apareceu**
- [ ] **A IA mencionou que `{api_address}` é específico por loja**
- [ ] **A IA explicou a relação com o callback OAuth**

##### Observações

```
```

---

#### 7.9 — Bash sem chamada à Tray (regressão crítica do bug do `PostToolUse:Bash`)

**Aplicável a:** Claude Code · Cursor
**Bloco:** 7B — pós-Bash
**O que valida:** comandos `Bash` triviais (`ls`, `find`, `git status`) **não disparam mais nada**, confirmando a remoção do hook quebrado.

##### Prompt (copy-paste)

> Roda `ls -la` no diretório atual e me mostra o que tem aqui.

##### Resultado esperado

1. A IA executa `ls -la` via `Bash`. Saída é a listagem de arquivos.
2. **Nenhum hook dispara nada.** Em particular: **nenhum** `hook stopped continuation` aparece.
3. A IA mostra o resultado normalmente.

##### Checklist de verificação

- [ ] **`Bash` foi executado**
- [ ] **NENHUM hook reportou ou interrompeu** *(regressão crítica)*
- [ ] **A IA mostrou a saída normalmente, em uma só passada**

##### Observações

```
```

---

#### 7.10 — Pergunta off-topic dentro do plugin (regressão Caso 1)

**Aplicável a:** Claude Code · Cursor
**Bloco:** 7B — pós-Bash
**O que valida:** prompts off-topic que disparam `Bash` para inspeção do próprio plugin não são interrompidos por hooks (Caso 1 do bug do `PostToolUse:Bash`).

##### Prompt (copy-paste)

> Qual a versão atual do plugin da Tray?

##### Resultado esperado

1. A IA usa `Bash`/`Glob`/`Read` para localizar o `package.json` ou `.claude-plugin/plugin.json`.
2. **Nenhum** `hook stopped continuation`.
3. A IA responde "1.2.0" (ou versão equivalente do momento).

##### Checklist de verificação

- [ ] **A IA encontrou o manifest e leu a versão**
- [ ] **NENHUM `hook stopped continuation` apareceu**
- [ ] **A IA respondeu a versão correta**

##### Observações

```
```
## Bloco 8 — Smoke test ferramentas secundárias

> Cobertura mínima em ferramentas onde **hooks não são suportados** e onde o plugin é entregue via arquivo de instrução (AGENTS.md / GEMINI.md / `.github/copilot-instructions.md` / regras nativas). Apenas verifica que o contexto é carregado e que a IA acerta o básico.

### 8.1 — Gemini CLI

**Aplicável a:** Gemini CLI
**Bloco:** 8 — Smoke test
**O que valida:** `GEMINI.md` é carregado automaticamente e fornece o contexto da API Tray.

#### Prompt (copy-paste)

> Como faço autenticação na API Tray?

#### Resultado esperado

1. Gemini CLI carrega `GEMINI.md` da raiz do repositório.
2. Resposta menciona OAuth 2.0 de 3 etapas, `consumer_key`/`consumer_secret`/`code`, expiração de 3h do `access_token` e 30 dias do `refresh_token`.

#### Checklist de verificação

- [ ] **`GEMINI.md` foi carregado:** verificar com `gemini --debug` ou similar (se disponível)
- [ ] **Resposta menciona OAuth de 3 etapas**
- [ ] **Resposta menciona `consumer_key`, `consumer_secret`, `code`**
- [ ] **Resposta menciona expiração de 3h e 30 dias**

#### Observações

```
```

---

### 8.2 — GitHub Copilot (VS Code)

**Aplicável a:** GitHub Copilot
**Bloco:** 8 — Smoke test
**O que valida:** `.github/copilot-instructions.md` é consumido nas sugestões do Copilot.

#### Prompt (gatilho via comentário em arquivo)

> Em um arquivo TypeScript novo, escrever o comentário `// Função para autenticar na API Tray via OAuth` e aceitar a sugestão automática do Copilot.

#### Resultado esperado

1. Copilot sugere uma função que referencia `consumer_key`, `consumer_secret`, `code`, `access_token`.
2. Sugestão usa `?access_token={token}` como query parameter (não header).

#### Checklist de verificação

- [ ] **Sugestão referencia `consumer_key`, `consumer_secret`, `code`**
- [ ] **Sugestão usa `access_token` como query parameter**
- [ ] **Sugestão NÃO usa Authorization header**
- [ ] **`.github/copilot-instructions.md` está presente no repositório**

#### Observações

```
```

---

### 8.3 — JetBrains AI Assistant

**Aplicável a:** JetBrains AI Assistant (IntelliJ / WebStorm / PyCharm / etc.)
**Bloco:** 8 — Smoke test
**O que valida:** `.aiassistant/rules/tray-api.md` é detectado como project rule.

#### Prompt (copy-paste)

> Como faço autenticação na API Tray?

#### Resultado esperado

1. JetBrains AI carrega `.aiassistant/rules/tray-api.md` automaticamente.
2. Resposta menciona OAuth de 3 etapas e os mesmos elementos do 8.1.

#### Checklist de verificação

- [ ] **A rule foi detectada:** verificar nas Settings → AI Assistant → Project Rules
- [ ] **Resposta menciona OAuth de 3 etapas**
- [ ] **Resposta menciona `consumer_key`, `consumer_secret`, `code`**

#### Observações

```
```

---

### 8.4 — Windsurf (Cascade)

**Aplicável a:** Windsurf (Cascade)
**Bloco:** 8 — Smoke test
**O que valida:** rule do Cascade é detectado. No projeto, o Cascade lê o `AGENTS.md` da raiz como rule always-on (ver `README.md`, seção *Windsurf (Cascade)*).

#### Prompt (copy-paste)

> Como faço autenticação na API Tray?

#### Resultado esperado

1. Windsurf detecta o `AGENTS.md` (raiz do repositório) como rule always-on do Cascade.
2. Resposta menciona OAuth de 3 etapas e os mesmos elementos do 8.1.

#### Checklist de verificação

- [ ] **`AGENTS.md` está na raiz do repositório de teste**
- [ ] **A rule foi detectada:** verificar painel Cascade ("Rules" / "Active rules")
- [ ] **Resposta menciona OAuth de 3 etapas**
- [ ] **Resposta menciona `consumer_key`, `consumer_secret`, `code`**

#### Observações

```
```
## Bloco 9 — `validate.mjs` v2 (CLI e output)

> Aplicável a Claude Code · Cursor · Codex. Testa as flags e exit codes
> introduzidos na 1.3.0: `--json`, `--schema=`, `--list-schemas`, e a
> distinção entre exit 1 (payload inválido) e exit 2 (erro de uso).

### 9.1 — Output JSON estruturado

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 9 — validate.mjs v2
**O que valida:** `--json` retorna `{valid, errors, schema, validatorVersion}` com `path`, `keyword`, `suggestion` por erro.

#### Prompt (copy-paste)

> Rode no shell: `node skills/produtos/scripts/validate.mjs --json --schema=produto.create '{"Product":{"price":1}}'`. Mostre a saída e me explique cada campo.

#### Resultado esperado

1. Exit code `1` (payload inválido).
2. `stdout` contém JSON com `valid: false`, array `errors` com 1 entrada (`keyword: "required"`, `path: "/Product/name"`), `schema: "produto.create"`, `validatorVersion: "2.0.0"`.
3. A IA explica: o JSON é o formato programático para integração com MCP/CI.

#### Checklist de verificação

- [ ] **Exit code 1** após o `Bash`
- [ ] **Saída é JSON parseável** (não texto livre)
- [ ] **Campo `valid`** presente e igual a `false`
- [ ] **Campo `errors[0].keyword`** igual a `"required"`
- [ ] **Campo `errors[0].path`** começa com `/Product/`
- [ ] **`validatorVersion`** igual a `"2.0.0"`

#### Observações

```
```

---

### 9.2 — Stdin (pipe)

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 9
**O que valida:** `validate.mjs` aceita payload via stdin sem flag adicional.

#### Prompt (copy-paste)

> Rode: `echo '{"Product":{"name":"X","price":1}}' | node skills/produtos/scripts/validate.mjs --schema=produto.create`. Mostre a saída.

#### Resultado esperado

1. Exit code `0` (válido).
2. `stdout`: `✅ Payload válido — pode prosseguir.`

#### Checklist

- [ ] **Exit 0**
- [ ] **Mensagem "Payload válido"**
- [ ] **Pipe funcionou** (sem mensagens de "nenhum payload fornecido")

#### Observações

```
```

---

### 9.3 — `--list-schemas` lista schemas da skill

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 9
**O que valida:** `--list-schemas` retorna lista e sai com 0; útil para discovery.

#### Prompt (copy-paste)

> Rode: `node skills/produtos/scripts/validate.mjs --list-schemas`.

#### Resultado esperado

1. Exit code `0`.
2. `stdout` contém `produto.create` e `produto.update`.

#### Checklist

- [ ] **Exit 0**
- [ ] **Lista contém `produto.create`**
- [ ] **Lista contém `produto.update`**

#### Observações

```
```

---

### 9.4 — PUT só com `price` é válido (regressão de falso negativo)

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 9
**O que valida:** schema multi-operação resolve o falso negativo da v1, onde PUT era validado contra schema de POST e exigia `name`.

#### Prompt (copy-paste)

> Preciso atualizar só o preço de um produto na minha loja Tray para 99.90. Use `validate.mjs` para confirmar que o payload está correto antes.

#### Resultado esperado

1. A IA usa skill `tray-produtos`.
2. Roda `node skills/produtos/scripts/validate.mjs --schema=produto.update '{"Product":{"price":99.9}}'`.
3. Exit `0` — payload válido.
4. Gera o `PUT /products/:id` correto.

#### Checklist

- [ ] **Skill correta:** `tray-produtos`
- [ ] **`--schema=produto.update` usado** (não `produto.create`)
- [ ] **`validate.mjs` aprovou** com payload só com `price`
- [ ] **Endpoint:** `PUT {api_address}/products/:id`

#### Observações

```
```

---

### 9.5 — Sem `--schema=` em skill com múltiplos → exit 2

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 9
**O que valida:** validate exige `--schema=` quando há múltiplos schemas; mensagem de erro lista os disponíveis.

#### Prompt (copy-paste)

> Rode: `node skills/produtos/scripts/validate.mjs '{"Product":{"name":"X","price":1}}'` (sem --schema). Mostre o que aconteceu.

#### Resultado esperado

1. Exit code `2`.
2. `stderr` contém `"múltiplos schemas"` e lista `produto.create, produto.update`.

#### Checklist

- [ ] **Exit 2**
- [ ] **Mensagem menciona "múltiplos schemas"**
- [ ] **Lista mostra `produto.create` e `produto.update`**

#### Observações

```
```

---

### 9.6 — `--schema=<inexistente>` → exit 2

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 9
**O que valida:** validate falha com exit 2 (erro de uso) quando schema não existe; sugere os disponíveis.

#### Prompt (copy-paste)

> Rode: `node skills/produtos/scripts/validate.mjs --schema=produto.upsert '{}'`. Mostre o erro.

#### Resultado esperado

1. Exit `2`.
2. `stderr` contém `não existe` e lista os disponíveis.

#### Checklist

- [ ] **Exit 2**
- [ ] **Mensagem menciona "não existe"**
- [ ] **Lista os schemas disponíveis**

#### Observações

```
```

---

### 9.7 — JSON malformado → exit 2

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 9
**O que valida:** payload com JSON inválido sai com 2, não 1.

#### Prompt (copy-paste)

> Rode: `node skills/produtos/scripts/validate.mjs --schema=produto.create '{name: X}'`. Mostre o erro.

#### Resultado esperado

1. Exit `2`.
2. `stderr` contém `JSON válido` ou `Unexpected token`.

#### Checklist

- [ ] **Exit 2** (não 1)
- [ ] **Mensagem identifica JSON malformado**

#### Observações

```
```

## Bloco 10 — Formats BR detectados pelo schema

> Aplicável a Claude Code · Cursor · Codex. Testa que dados brasileiros
> mal-formados (CPF/CNPJ com DV errado, EAN com DV errado, NCM com 7 dígitos,
> data DD/MM/YYYY) são rejeitados pelo `validate.mjs` v2 — não apenas pela
> regra do `AGENTS.md`. Comportamento alterado em 1.3.0: o schema agora
> contém `format: cpf`/`cnpj`/`ean`/`ncm`/`date`.

### 10.1 — CPF inválido detectado pelo schema

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 10 — formats BR
**O que valida:** `validate.mjs --schema=cliente.create` rejeita CPF `'111'` pelo `format: cpf` (não só pelo AGENTS.md).

#### Prompt (copy-paste)

> Cadastra um cliente na Tray: nome 'Maria', email 'maria@x.com', CPF '111'. Use o validate antes.

#### Resultado esperado

1. A IA usa `tray-clientes`.
2. Roda `validate.mjs --schema=cliente.create '{"Customer":{"name":"Maria","email":"maria@x.com","cpf":"111"}}'`.
3. Exit `1`. Mensagem inclui `CPF inválido`.
4. A IA explica que CPF precisa de 11 dígitos com DV correto e pede CPF válido ao usuário (sem enviar à API).

#### Checklist

- [ ] **Skill correta:** `tray-clientes`
- [ ] **`validate.mjs --schema=cliente.create` foi executado**
- [ ] **Exit 1, mensagem com `CPF inválido`**
- [ ] **A IA não chamou a API** com o payload rejeitado

#### Observações

```
```

---

### 10.2 — CNPJ todos zeros rejeitado

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 10
**O que valida:** CNPJ `'00000000000000'` (mesmo "tendo 14 dígitos") falha no algoritmo de DV.

#### Prompt (copy-paste)

> Roda: `node skills/clientes/scripts/validate.mjs --schema=cliente.create '{"Customer":{"name":"ACME","email":"a@b.com","cnpj":"00000000000000"}}'`. Mostre o resultado.

#### Resultado esperado

1. Exit `1`.
2. Mensagem `CNPJ inválido — algoritmo de verificação falhou`.

#### Checklist

- [ ] **Exit 1**
- [ ] **Mensagem menciona algoritmo de verificação**

#### Observações

```
```

---

### 10.3 — CEP < 8 dígitos rejeitado

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 10
**O que valida:** schema com `format: cep` rejeita CEP curto. *Nota: este cenário valida o format `cep` mesmo quando aplicado a um schema custom de teste; nas skills atuais só `cliente.update` poderia receber CEP indiretamente. Use o validador da lib direto.*

#### Prompt (copy-paste)

> Rode: `node -e "import('./scripts/lib/validate-schema.mjs').then(({validatePayload}) => console.log(validatePayload({type:'object', properties:{cep:{type:'string',format:'cep'}}}, {cep:'1234'})))"`. Mostre.

#### Resultado esperado

1. `stdout` contém um array com 1 erro mencionando "CEP inválido".

#### Checklist

- [ ] **1 erro retornado**
- [ ] **Mensagem menciona "CEP inválido"**

#### Observações

```
```

---

### 10.4 — EAN com DV errado rejeitado

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 10
**O que valida:** EAN `'7891000100100'` (DV correto seria `103`) é rejeitado pelo `format: ean`.

#### Prompt (copy-paste)

> Cadastra um produto na Tray: nome 'Leite Moça falso', preço 5.99, EAN '7891000100100'. Use o validate.

#### Resultado esperado

1. A IA usa `tray-produtos`.
2. Roda `validate.mjs --schema=produto.create` com o EAN.
3. Exit `1`. Mensagem `EAN/GTIN inválido — DV incorreto`.
4. A IA pede EAN correto (não chuta).

#### Checklist

- [ ] **Skill correta:** `tray-produtos`
- [ ] **Exit 1, mensagem sobre DV do EAN**
- [ ] **A IA não chamou a API**

#### Observações

```
```

---

### 10.5 — NCM com 7 dígitos rejeitado

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 10
**O que valida:** NCM tem que ter 8 dígitos numéricos.

#### Prompt (copy-paste)

> Roda: `node skills/produtos/scripts/validate.mjs --schema=produto.create '{"Product":{"name":"X","price":1,"ncm":"6109100"}}'`. Mostre.

#### Resultado esperado

1. Exit `1`.
2. Mensagem `NCM inválido — use 8 dígitos numéricos`.

#### Checklist

- [ ] **Exit 1**
- [ ] **Mensagem menciona 8 dígitos**

#### Observações

```
```

---

### 10.6 — Data DD/MM/YYYY rejeitada

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 10
**O que valida:** `format: date` aceita só `YYYY-MM-DD`.

#### Prompt (copy-paste)

> Crie um pedido na Tray para o cliente 1, produto 1 quantidade 1, com `shipping_date` "15/04/2026". Use o validate.

#### Resultado esperado

1. A IA usa `tray-pedidos`.
2. Roda `validate.mjs --schema=pedido.create` com a data BR.
3. Exit `1`. Mensagem `Data inválida — use YYYY-MM-DD`.
4. A IA corrige para `'2026-04-15'` e revalida.

#### Checklist

- [ ] **Skill correta:** `tray-pedidos`
- [ ] **Exit 1 inicial, mensagem sobre YYYY-MM-DD**
- [ ] **A IA corrigiu a data antes de re-rodar**
- [ ] **Re-validação aprovou** após correção

#### Observações

```
```

## Bloco 11 — Skills novas com `validate.mjs`

> Aplicável a Claude Code · Cursor · Codex. Testa que as 3 skills novas
> (`tray-variacoes`, `tray-categorias`, `tray-marcas`) ganham `validate.mjs`
> na 1.3.0 e que a IA usa o validador antes de chamar a API.

### 11.1 — Cadastro de variação de produto

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 11 — skills novas
**O que valida:** A IA seleciona `tray-variacoes` (não `tray-produtos`), monta payload com `Variant` envelope, roda `validate.mjs --schema=variacao.create` e o validador aprova.

#### Prompt (copy-paste)

> Adicione uma variação azul tamanho M do produto 42 na minha loja Tray, SKU 'CAM-AZ-M', preço 49.90, estoque 30.

#### Resultado esperado

1. Skill: `tray-variacoes` (não `tray-produtos`).
2. Roda `validate.mjs --schema=variacao.create '{"Variant":{"sku":"CAM-AZ-M","price":49.9,"stock":30}}'`.
3. Exit `0`.
4. Endpoint: `POST {api_address}/products/42/variants?access_token=...`.

#### Checklist

- [ ] **Skill correta:** `tray-variacoes`
- [ ] **`validate.mjs --schema=variacao.create` foi executado**
- [ ] **Endpoint:** `/products/42/variants`
- [ ] **Body envelope `{"Variant":{...}}`**

#### Observações

```
```

---

### 11.2 — Cadastro de categoria

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 11
**O que valida:** A IA usa `tray-categorias` e `validate.mjs --schema=categoria.create` antes de chamar a API.

#### Prompt (copy-paste)

> Crie uma categoria 'Esportes' na minha Tray, dentro da categoria-pai 'Masculino' (id 5).

#### Resultado esperado

1. Skill: `tray-categorias`.
2. Roda `validate.mjs --schema=categoria.create '{"Category":{"name":"Esportes","parent_id":5}}'`.
3. Exit `0`.
4. Endpoint: `POST {api_address}/categories`.

#### Checklist

- [ ] **Skill correta:** `tray-categorias`
- [ ] **`validate.mjs --schema=categoria.create` executado**
- [ ] **Body envelope `{"Category":{...}}`**

#### Observações

```
```

---

### 11.3 — Cadastro de marca com pattern de slug

**Aplicável a:** Claude Code · Cursor · Codex
**Bloco:** 11
**O que valida:** `marca.create` valida `slug` contra `pattern: ^[a-z0-9-]+$`. A IA testa primeiro um slug inválido, é rejeitada, corrige e re-valida.

#### Prompt (copy-paste)

> Crie a marca 'Nike Air' na Tray. Use o slug 'Nike Air' como URL amigável.

#### Resultado esperado

1. Skill: `tray-marcas`.
2. Primeira tentativa: `validate.mjs --schema=marca.create '{"Brand":{"name":"Nike Air","slug":"Nike Air"}}'` → exit `1` com mensagem mencionando `pattern`.
3. A IA corrige slug para `'nike-air'` (lowercase, hífen) e re-valida.
4. Segunda tentativa exit `0`.
5. Endpoint: `POST {api_address}/brands`.

#### Checklist

- [ ] **Skill correta:** `tray-marcas`
- [ ] **Primeira validação falhou (pattern)**
- [ ] **A IA corrigiu o slug** (lowercase + hífen)
- [ ] **Segunda validação aprovou**

#### Observações

```
```

## Próximos passos (robustez futura)

A v1 cobre o suficiente para validar as mudanças da branch `feat/skill-validation-and-disambiguation`. Para uma v2, eis cenários extras já mapeados — mantidos aqui para o time não esquecer:

### OAuth e auth

- **Erros `1099` e `1000`–`1003`** — verificar que a IA reconhece cada estado da loja e orienta corretamente.
- **Renovação proativa** — pedir agendamento de renovação do `access_token` com margem ≤ 2h30 antes da expiração de 3h.

### Rate limit e robustez de rede

- **Curva de backoff exponencial em 429** — validar `1s, 2s, 4s, 8s, ...`.
- **Operação em lote** — importação de 1.000 produtos com `150 itens/batch + pausa de 60s entre batches`.
- **Paginação com `pager.total > 50`** — listar todos os pedidos do mês com loop iterativo.

### Regras BR

- **CNPJ malformado** — análogo ao `3.2`, mas para cliente PJ.
- **CEP malformado** — endereço com CEP não-numérico ou `< 8` dígitos.
- **NCM com 7 dígitos** ou **EAN sem dígito verificador**.
- **Datas em `DD/MM/YYYY`** (errado) vs `YYYY-MM-DD`.

### Skills sem schema (29 restantes)

Adicionar cenários para `multi-cd`, `kits compostos`, `listas-preco-b2b`, `cupons`, `notas-fiscais`, etc.

### Regressão / negativa

- **Recurso inexistente** — pedir algo cuja skill correta não existe e validar que a IA não inventa endpoint.
- **Ambiguidade entre 2 skills** — `pedidos` vs `status-pedido`, `clientes` vs `enderecos-cliente`, `produtos` vs `informacoes-adicionais`.
