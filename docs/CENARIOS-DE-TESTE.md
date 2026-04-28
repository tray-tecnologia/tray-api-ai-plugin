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

> Mistura proposital: 3.1 e 3.3 testam o `validate.mjs` rejeitando campos `required` faltantes; 3.2 testa a regra BR de CPF (algoritmo de verificação) que vem do `AGENTS.md` — o `validate.mjs` de `clientes` não tem regex de CPF, apenas `maxLength: 14`.

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
3. **Não** entregar código pronto. Em vez disso, alertar o usuário: "o nome é obrigatório; me passe um nome para eu cadastrar o produto" (ou colocar um placeholder evidente como `name: '<NOME OBRIGATÓRIO>'` e marcar para preenchimento).

#### Checklist de verificação

- [ ] **Skill selecionada:** `tray-produtos`
- [ ] **`validate.mjs` executado:** sim
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
**O que valida:** a IA reconhece CPF inválido pela regra do `AGENTS.md` (11 dígitos + algoritmo de verificação) — o `validate.mjs` por si só **não** detecta isso.

#### Prompt (copy-paste)

> Cadastra um cliente na Tray: nome 'Maria', email 'maria@x.com', CPF '111'.

#### Resultado esperado

A IA deve:

1. Usar `tray-clientes`.
2. Reconhecer CPF malformado pela regra do `AGENTS.md` ("CPF: 11 dígitos, validar com algoritmo de verificação").
3. **Não** enviar — alertar o usuário que `'111'` não é CPF válido e pedir um CPF correto.
4. (Opcional) Rodar `validate.mjs` — vai aprovar (schema só checa `maxLength: 14`), o que reforça que a barreira veio do `AGENTS.md`, não do schema.

#### Checklist de verificação

- [ ] **Skill selecionada:** `tray-clientes`
- [ ] **Regra BR do `AGENTS.md` aplicada:** IA reconheceu CPF inválido
- [ ] **IA não enviou payload com CPF malformado**
- [ ] **`validate.mjs` (se rodado) aprovou** — confirma que a barreira não veio do schema
- [ ] **Hook `UserPromptSubmit` disparou** *(apenas CC / Cursor)*
- [ ] **Hook não interrompeu**

#### Observações

```
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
**O que valida:** o gatilho `api.*tray` dispara.

#### Prompt (copy-paste)

> Como faço autenticação na API Tray?

#### Resultado esperado

1. Hook `UserPromptSubmit` **DISPARA** — match em `api.*tray`.
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
**O que valida:** prompt com `api.*tray` que pede explicitamente algo não-Tray.

#### Prompt (copy-paste)

> Já usei a API Tray no passado, mas agora preciso aprender autenticação genérica em Express com Passport.js. Me explica do zero, sem mencionar Tray.

#### Resultado esperado

1. Hook `UserPromptSubmit` **DISPARA** (match em `api.*tray`).
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
## Bloco 7 — `PostToolUse` (Write/Edit/Bash)

> *Aplicável apenas a Claude Code e Cursor.* Testa os dois hooks `PostToolUse`: 7A após `Write|Edit` (segurança/qualidade do código gerado), 7B após `Bash` (diagnóstico de respostas HTTP da Tray).

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

### Sub-grupo 7B — `Bash`

#### 7.3 — HTTP 401 (token inválido/expirado)

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 7B — Bash
**O que valida:** após `Bash` cuja saída tem HTTP 401 da Tray, o hook diagnostica e orienta.

##### Prompt (copy-paste)

> Roda este curl: `curl -i 'https://abc.commercesuite.com.br/products?access_token=invalid'` e me explica o resultado.

##### Resultado esperado

1. A IA executa via `Bash` o `curl`.
2. Saída tem `HTTP/1.1 401` e provavelmente `error_code: 1099`.
3. Hook `PostToolUse` (matcher `Bash`) dispara e orienta:
   - "HTTP 401 — `access_token` expirado/inválido"
   - "renovar via `refresh_token`"
4. A IA explica e sugere a renovação.

##### Checklist de verificação

- [ ] **`Bash` foi executado e retornou HTTP 401**
- [ ] **Hook `PostToolUse` (Bash) disparou**
- [ ] **Texto do alerta menciona "HTTP 401" e "refresh_token"**
- [ ] **A IA explicou ao usuário e sugeriu renovação**

##### Observações

```
```

---

#### 7.4 — HTTP 429 (rate limit)

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 7B — Bash
**O que valida:** após `Bash` cuja saída tem HTTP 429, o hook orienta sobre backoff.

##### Prompt (copy-paste)

> Roda um loop com 200 requisições para GET /products da minha loja Tray e me mostra o que aconteceu nas últimas 20 respostas.

##### Resultado esperado

1. A IA executa um loop via `Bash`. As últimas respostas devem retornar HTTP 429.
2. Hook `PostToolUse` (Bash) dispara e orienta:
   - "HTTP 429 — rate limit (180 req/min, 10.000 req/dia)"
   - "backoff exponencial"
3. A IA implementa backoff ou agrupa requisições.

##### Checklist de verificação

- [ ] **`Bash` foi executado e retornou HTTP 429 em pelo menos uma das requisições**
- [ ] **Hook `PostToolUse` (Bash) disparou**
- [ ] **Texto do alerta menciona "rate limit", "180 req/min" e "backoff"**
- [ ] **A IA implementou backoff exponencial ou explicou a estratégia**

##### Observações

```
```

---

#### 7.5 — HTTP 400 (campo obrigatório / formato inválido)

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 7B — Bash
**O que valida:** após `Bash` cuja saída tem HTTP 400 com mensagem de campo, o hook sugere `validate.mjs`.

##### Prompt (copy-paste)

> Roda este curl para criar um produto na Tray: `curl -X POST 'https://abc.commercesuite.com.br/products?access_token=TOKEN' -d '{"Product": {"price": 99}}'` e mostra o resultado.

##### Resultado esperado

1. A IA executa via `Bash`. Saída: HTTP 400 com mensagem sobre `name` obrigatório.
2. Hook `PostToolUse` (Bash) dispara e orienta:
   - "HTTP 400 — campo obrigatório / formato inválido"
   - "rodar `skills/produtos/scripts/validate.mjs` antes da próxima tentativa"
3. A IA roda `validate.mjs` localmente, vê que falta `name`, corrige.

##### Checklist de verificação

- [ ] **`Bash` foi executado e retornou HTTP 400**
- [ ] **Hook `PostToolUse` (Bash) disparou**
- [ ] **Texto do alerta sugere `validate.mjs`**
- [ ] **A IA rodou o validador localmente e identificou o campo faltando**

##### Observações

```
```

---

#### 7.6 — HTTP 404 (URL base errada / `api_address` incorreto)

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 7B — Bash
**O que valida:** após `Bash` apontando para domínio Tray genérico, o hook orienta sobre `api_address`.

##### Prompt (copy-paste)

> Roda este curl: `curl -i 'https://api.tray.com.br/products?access_token=TOKEN'` (sem usar o api_address da loja, usei o domínio público) e me explica o erro.

##### Resultado esperado

1. A IA executa via `Bash`. Saída: HTTP 404 ou similar.
2. Hook `PostToolUse` (Bash) dispara e orienta:
   - "{api_address} é específico por loja, retornado no callback OAuth"
3. A IA explica que cada loja tem seu próprio `api_address`.

##### Checklist de verificação

- [ ] **`Bash` foi executado e retornou HTTP 404**
- [ ] **Hook `PostToolUse` (Bash) disparou**
- [ ] **Texto do alerta menciona "{api_address}" e "específico por loja"**
- [ ] **A IA explicou que `api_address` vem do callback OAuth**

##### Observações

```
```

---

#### 7.7 — Bash sem chamada à Tray (regressão)

**Aplicável a:** Claude Code · Cursor *(hook não existe nas demais)*
**Bloco:** 7B — Bash
**O que valida:** o hook `PostToolUse` (Bash) **NÃO** responde quando o comando não é da API Tray — fica calado, conforme instrução do prompt do hook.

##### Prompt (copy-paste)

> Roda `ls -la` no diretório atual e me mostra o que tem aqui.

##### Resultado esperado

1. A IA executa `ls -la` via `Bash`. Saída é a listagem de arquivos do diretório.
2. Hook `PostToolUse` (Bash) **NÃO** responde — saída não tem chamada à Tray nem código HTTP da Tray.
3. A IA mostra o resultado normalmente.

##### Checklist de verificação

- [ ] **`Bash` foi executado**
- [ ] **Hook `PostToolUse` (Bash) NÃO disparou** *(regressão — não pode poluir respostas não-Tray)*
- [ ] **A IA mostrou a saída normalmente**

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

#### Prompt (não é prompt, é gatilho contextual)

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
**O que valida:** rule do Cascade é detectado.

#### Prompt (copy-paste)

> Como faço autenticação na API Tray?

#### Resultado esperado

1. Windsurf detecta a rule do Cascade e carrega o contexto.
2. Resposta menciona OAuth de 3 etapas e os mesmos elementos do 8.1.

#### Checklist de verificação

- [ ] **A rule foi detectada:** verificar painel Cascade
- [ ] **Resposta menciona OAuth de 3 etapas**
- [ ] **Resposta menciona `consumer_key`, `consumer_secret`, `code`**

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
