# Test Scenarios — Validação de Skills, Payload e Hooks

**Criado em:** 2026-04-28  
**Branch de referência:** `feat/skill-validation-and-disambiguation`  
**Versão do plugin:** ver `package.json`

---

## O que está sendo testado

Esta branch introduziu três categorias de melhoria em relação à `main`:

| Categoria | O que mudou |
|:--|:--|
| **Seleção de skill** | Frontmatter `when_not_to_use` adicionado a todas as skills para desambiguação entre recursos relacionados |
| **Checklist obrigatório** | Seção "Antes de responder" com 5 verificações adicionada em cada SKILL.md |
| **Validação de payload** | Scripts `validate.mjs` + `schema.json` para autorizacao, clientes, pedidos, produtos e webhooks |
| **Correção de hooks** | Matcher do `UserPromptSubmit` corrigido para evitar falsos positivos (ex: menção ao nome do projeto) e prompt do hook ajustado para ser apenas informativo |

---

## 1. Como usar este documento

### Pré-requisitos

- Plugin instalado e ativo no repositório-alvo
- Node.js disponível no PATH (para cenários com `validate.mjs`)
- Acesso ao histórico de tool calls / terminal da ferramenta em uso

### Fluxo de execução

1. Cole o **Prompt** exato na ferramenta
2. Aguarde a resposta completa
3. Marque cada item do checklist com `✅` (passou) ou `❌` (falhou)
4. Anote observações se o comportamento divergir do esperado

### Legenda de tipos de cenário

| Tipo | Descrição |
|:--|:--|
| `happy-path` | Caso direto, input claro para um único recurso |
| `edge-case` | Variação de um recurso que exige lógica específica |
| `cross-skill` | Prompt que envolve dois ou mais recursos — testa seleção correta |
| `hook-positivo` | Prompt que deve disparar o hook |
| `hook-negativo` | Prompt que **não** deve disparar o hook |

---

## 2. Critérios Globais Obrigatórios

Os critérios abaixo aplicam-se a **todos** os cenários de skill (seções 3 e 4). Verifique-os em conjunto com o checklist específico de cada card.

### CG-01 — Skill correta foi ativada

A IA utilizou a documentação da skill esperada, não de um recurso adjacente.

| Ferramenta | Como verificar |
|:--|:--|
| **Claude Code** | A resposta referencia os endpoints corretos do recurso (ex: `/products`, não `/variants`). Em modo verbose (`claude --verbose`), a skill carregada aparece no log de contexto. |
| **Cursor** | Se a skill está como Cursor Rule, o painel de contexto exibe o arquivo `SKILL.md` ativo. Em chat, a IA cita a documentação do recurso correto. |
| **Codex CLI** | Inspecione se a resposta cita os endpoints e campos do recurso solicitado. Se a skill foi passada via `--context`, confirme que o arquivo correto foi referenciado. |

### CG-02 — Checklist "Antes de responder" foi seguido

A IA executou as 5 verificações da seção "Antes de responder" da skill antes de gerar o código.

| Ferramenta | Como verificar |
|:--|:--|
| **Claude Code** | Procure menção explícita às verificações no raciocínio (ex: "confirmei o método HTTP", "verifiquei os campos obrigatórios"). Com `claude --verbose`, o processo de pensamento fica visível. |
| **Cursor** | Verifique se a resposta inclui validações do payload antes de retornar o código. O Cursor pode suprimir o raciocínio intermediário — inspecione se o código gerado atende os critérios. |
| **Codex CLI** | Idem Cursor — avalie pelo resultado: o código gerado está correto e completo sem precisar de correção? |

### CG-03 — `validate.mjs` foi executado (apenas skills com schema)

Aplicável às skills: `autorizacao`, `clientes`, `pedidos`, `produtos`, `webhooks`.

| Ferramenta | Como verificar |
|:--|:--|
| **Claude Code** | Procure um tool call `Bash` com `node skills/<recurso>/scripts/validate.mjs` no histórico da conversa. A saída deve conter `✅ Payload válido` ou uma lista de erros seguida de correção. |
| **Cursor** | Procure um comando de terminal `node skills/<recurso>/scripts/validate.mjs` executado pelo agente via aba Terminal ou Shell tool call no chat. |
| **Codex CLI** | Codex pode não executar o script automaticamente. Verifique se ele sugere o comando no output — se sim, execute manualmente e confirme. ⚠️ _Execução automática depende da configuração do manifest `.codex-plugin/`._ |

### CG-04 — `access_token` não está hardcoded

O código gerado nunca contém um token literal — usa variável de ambiente.

| Ferramenta | Como verificar |
|:--|:--|
| **Claude Code / Cursor / Codex CLI** | Inspecione o código gerado. Deve conter `process.env.TRAY_ACCESS_TOKEN` (Node.js), `os.environ["TRAY_ACCESS_TOKEN"]` (Python) ou equivalente. Strings como `"abc123..."` ou `"seu_token_aqui"` são falha. |

### CG-05 — Método HTTP e endpoint corretos

| Ferramenta | Como verificar |
|:--|:--|
| **Claude Code / Cursor / Codex CLI** | Compare o método e caminho gerado com a tabela de endpoints da skill. Ex: cadastro de produto → `POST /products`, não `PUT /products`. |

### CG-06 — Campos obrigatórios presentes no payload

| Ferramenta | Como verificar |
|:--|:--|
| **Claude Code / Cursor / Codex CLI** | Consulte a seção "Campos Obrigatórios" da skill e confirme que todos aparecem no payload gerado. Para skills com schema, o `validate.mjs` faz isso automaticamente (CG-03). |

---

## 3. Cenários por Recurso

---

### TC-AUTH-01 · Fluxo OAuth completo
**Tipo:** happy-path  
**Skill esperada:** `tray-autorizacao`  
**Prompt:**
> "Implemente o fluxo OAuth completo para conectar meu app à API Tray, incluindo renovação automática do access_token"

**Skills que devem ser ativadas:** `tray-autorizacao`  
**Skills que NÃO devem ser ativadas:** `tray-produtos`, `tray-pedidos`

**Checklist:**
- [ ] (CG-01) Skill `tray-autorizacao` utilizada
- [ ] (CG-02) Checklist "Antes de responder" seguido
- [ ] (CG-03) `validate.mjs` de autorizacao executado
- [ ] (CG-04) `consumer_key`, `consumer_secret` e tokens não estão hardcoded
- [ ] (CG-05) Fluxo de 3 etapas correto: redirect → callback → `POST /auth`
- [ ] Renovação automática antes das 3h implementada (ex: `setInterval` ou middleware)
- [ ] Variáveis de ambiente nomeadas corretamente (`TRAY_CONSUMER_KEY`, `TRAY_CONSUMER_SECRET`)

---

### TC-AUTH-02 · Tratamento de token expirado
**Tipo:** edge-case  
**Skill esperada:** `tray-autorizacao`  
**Prompt:**
> "Como trato o erro 1099 da API Tray e renovo o token automaticamente quando ele expirar?"

**Checklist:**
- [ ] (CG-01) Skill `tray-autorizacao` utilizada
- [ ] (CG-04) Tokens não hardcoded
- [ ] Código de erro `1099` tratado explicitamente
- [ ] Lógica de retry com `refresh_token` implementada
- [ ] `GET /auth?refresh_token={token}` como endpoint de renovação

---

### TC-PROD-01 · Cadastrar produto
**Tipo:** happy-path  
**Skill esperada:** `tray-produtos`  
**Prompt:**
> "Crie uma função que cadastre um produto na minha loja Tray com nome, preço e estoque"

**Skills que devem ser ativadas:** `tray-produtos`  
**Skills que NÃO devem ser ativadas:** `tray-variacoes`, `tray-imagens-produtos`, `tray-kits`

**Checklist:**
- [ ] (CG-01) Skill `tray-produtos` utilizada
- [ ] (CG-02) Checklist "Antes de responder" seguido
- [ ] (CG-03) `validate.mjs` de produtos executado
- [ ] (CG-04) `access_token` não hardcoded
- [ ] (CG-05) `POST /products` correto
- [ ] Body usa wrapper `{"Product": {...}}`
- [ ] Campo `name` presente no payload
- [ ] Campo `price` presente no payload
- [ ] Campo `available` presente no payload

---

### TC-PROD-02 · Atualizar produto
**Tipo:** happy-path  
**Skill esperada:** `tray-produtos`  
**Prompt:**
> "Atualize o estoque e o preço promocional do produto ID 123 na Tray"

**Checklist:**
- [ ] (CG-01) Skill `tray-produtos` utilizada
- [ ] (CG-03) `validate.mjs` de produtos executado
- [ ] (CG-05) `PUT /products/123` correto (não POST)
- [ ] Body usa wrapper `{"Product": {...}}`
- [ ] Campos `stock` e `promotional_price` presentes

---

### TC-PROD-03 · Listar produtos com filtro
**Tipo:** happy-path  
**Skill esperada:** `tray-produtos`  
**Prompt:**
> "Liste todos os produtos sem estoque disponível da minha loja Tray, com paginação"

**Checklist:**
- [ ] (CG-01) Skill `tray-produtos` utilizada
- [ ] (CG-05) `GET /products` com query params de filtro
- [ ] Filtro `available=0` ou `stock=0` presente
- [ ] Parâmetros de paginação `limit` e `page` incluídos
- [ ] `limit` não ultrapassa 50 (máximo da API)

---

### TC-PED-01 · Listar pedidos recentes
**Tipo:** happy-path  
**Skill esperada:** `tray-pedidos`  
**Prompt:**
> "Crie um sistema que liste os pedidos pendentes dos últimos 7 dias da minha loja"

**Skills que devem ser ativadas:** `tray-pedidos`  
**Skills que NÃO devem ser ativadas:** `tray-status-pedido`, `tray-notas-fiscais`, `tray-pagamentos`

**Checklist:**
- [ ] (CG-01) Skill `tray-pedidos` utilizada
- [ ] (CG-03) `validate.mjs` de pedidos executado
- [ ] (CG-05) `GET /orders` com filtros corretos
- [ ] Filtro de data nos últimos 7 dias presente
- [ ] Filtro de status pendente incluído
- [ ] Paginação implementada

---

### TC-PED-02 · Cancelar pedido
**Tipo:** edge-case  
**Skill esperada:** `tray-pedidos`  
**Prompt:**
> "Como cancelo o pedido ID 789 programaticamente via API Tray?"

**Checklist:**
- [ ] (CG-01) Skill `tray-pedidos` utilizada
- [ ] (CG-05) `PUT /orders/789/cancel` correto (não DELETE)
- [ ] (CG-04) `access_token` não hardcoded

---

### TC-CLI-01 · Buscar cliente por e-mail
**Tipo:** happy-path  
**Skill esperada:** `tray-clientes`  
**Prompt:**
> "Crie uma função que busque um cliente pelo e-mail na API Tray"

**Skills que devem ser ativadas:** `tray-clientes`  
**Skills que NÃO devem ser ativadas:** `tray-enderecos-cliente`, `tray-perfis-cliente`

**Checklist:**
- [ ] (CG-01) Skill `tray-clientes` utilizada
- [ ] (CG-03) `validate.mjs` de clientes executado
- [ ] (CG-05) `GET /customers` com filtro de e-mail
- [ ] (CG-04) `access_token` não hardcoded

---

### TC-CLI-02 · Cadastrar cliente
**Tipo:** happy-path  
**Skill esperada:** `tray-clientes`  
**Prompt:**
> "Cadastre um novo cliente com nome, e-mail e CPF na loja Tray"

**Checklist:**
- [ ] (CG-01) Skill `tray-clientes` utilizada
- [ ] (CG-03) `validate.mjs` de clientes executado
- [ ] (CG-05) `POST /customers` correto
- [ ] Campos `name`, `email` e `cpf` presentes no payload
- [ ] Body usa wrapper `{"Customer": {...}}`

---

### TC-WHK-01 · Implementar endpoint receptor de webhooks
**Tipo:** happy-path  
**Skill esperada:** `tray-webhooks`  
**Prompt:**
> "Implemente um endpoint receptor de webhooks da Tray para processar eventos de novos pedidos"

**Skills que devem ser ativadas:** `tray-webhooks`

> ⚠️ **Nota:** Webhooks na Tray são ativados via **ticket de suporte** informando a URL do endpoint — não há endpoint de registro via API. O papel da skill aqui é guiar a implementação do receptor, não do registro.

**Checklist:**
- [ ] (CG-01) Skill `tray-webhooks` utilizada (não `tray-pedidos`)
- [ ] (CG-03) `validate.mjs` de webhooks executado (valida o payload do receptor)
- [ ] Endpoint retorna HTTP 200 imediatamente antes de processar
- [ ] Payload lido como `application/x-www-form-urlencoded` (não JSON)
- [ ] Switch/roteamento por `scope_name + "_" + act` (ex: `order_insert`)
- [ ] Processamento assíncrono após o HTTP 200
- [ ] A resposta menciona que a ativação do webhook exige ticket de suporte Tray

---

### TC-CAT-01 · Listar categorias em árvore
**Tipo:** happy-path  
**Skill esperada:** `tray-categorias`  
**Prompt:**
> "Liste todas as categorias da minha loja Tray em formato de árvore hierárquica"

**Checklist:**
- [ ] (CG-01) Skill `tray-categorias` utilizada (não `tray-marcas` nem `tray-caracteristicas`)
- [ ] (CG-05) `GET /categories` correto
- [ ] Estrutura hierárquica presente na resposta/código (parent_id usado para montar a árvore)

---

### TC-VAR-01 · Cadastrar variações de produto
**Tipo:** happy-path  
**Skill esperada:** `tray-variacoes`  
**Prompt:**
> "Cadastre variações de cor e tamanho para o produto ID 456 na Tray"

**Skills que devem ser ativadas:** `tray-variacoes`  
**Skills que NÃO devem ser ativadas:** `tray-produtos`, `tray-caracteristicas`

**Checklist:**
- [ ] (CG-01) Skill `tray-variacoes` utilizada (não `tray-produtos`)
- [ ] (CG-05) `POST /variants` ou `POST /products/456/variants` correto
- [ ] Atributos de cor e tamanho presentes no payload
- [ ] (CG-04) `access_token` não hardcoded

---

### TC-FRT-01 · Calcular frete por CEP
**Tipo:** happy-path  
**Skill esperada:** `tray-frete`  
**Prompt:**
> "Calcule o frete para o CEP 01310-100 com peso de 500g usando a API Tray"

**Skills que devem ser ativadas:** `tray-frete`  
**Skills que NÃO devem ser ativadas:** `tray-configuracao-frete`

**Checklist:**
- [ ] (CG-01) Skill `tray-frete` utilizada (não `tray-configuracao-frete`)
- [ ] (CG-05) `GET /freights` com parâmetros corretos
- [ ] CEP destino presente como parâmetro
- [ ] Peso presente como parâmetro

---

## 4. Cenários de Ambiguidade (cross-skill)

Estes cenários testam se a IA consegue **separar corretamente** os recursos quando o prompt menciona múltiplas APIs.

---

### TC-AMB-01 · Login + listagem de produtos
**Tipo:** cross-skill  
**Skills esperadas:** `tray-autorizacao` → `tray-produtos`  
**Prompt:**
> "Crie um sistema completo que faça login na API Tray e liste os produtos da minha loja"

**Checklist:**
- [ ] Ambas as skills `tray-autorizacao` e `tray-produtos` foram utilizadas
- [ ] Fluxo OAuth implementado antes da listagem de produtos
- [ ] `GET /products` com `access_token` obtido do fluxo de auth
- [ ] `tray-variacoes` e `tray-imagens-produtos` **não** foram confundidas com `tray-produtos`
- [ ] (CG-04) Tokens não hardcoded em nenhuma parte do código

---

### TC-AMB-02 · Produto + variação + imagem no mesmo prompt
**Tipo:** cross-skill  
**Skills esperadas:** `tray-produtos`, `tray-variacoes`, `tray-imagens-produtos`  
**Prompt:**
> "Cadastre um produto com variações de cor e adicione uma imagem a ele"

**Checklist:**
- [ ] Skill `tray-produtos` usada para o cadastro do produto pai (`POST /products`)
- [ ] Skill `tray-variacoes` usada para as variações, **não** `tray-produtos`
- [ ] Skill `tray-imagens-produtos` usada para o upload da imagem
- [ ] Sequência correta: produto → variações → imagem (produto existe antes das dependências)
- [ ] `when_not_to_use` de `tray-produtos` foi respeitado (variações não foram colocadas no payload de produto)

---

### TC-AMB-03 · Pedido + nota fiscal + status
**Tipo:** cross-skill  
**Skills esperadas:** `tray-pedidos` para o core, `tray-notas-fiscais` para NF, `tray-status-pedido` se atualizar status customizado  
**Prompt:**
> "Atualize o status do pedido 789 para 'enviado' e registre a nota fiscal correspondente"

**Checklist:**
- [ ] Skill `tray-pedidos` usada para atualizar o pedido
- [ ] Skill `tray-notas-fiscais` usada para a NF — **não** `tray-pedidos` para esse fim
- [ ] `tray-pagamentos` **não** foi ativado indevidamente
- [ ] Endpoints corretos para cada operação estão separados no código

---

## 5. Cenários de Hook

Os hooks testados aqui estão em `hooks/hooks.json`. O hook `UserPromptSubmit` teve seu matcher corrigido nesta branch:

| Branch | Matcher antigo (main) | Matcher novo (feat) |
|:--|:--|:--|
| Trigger | `tray\|Tray\|TRAY\|api_address\|access_token.*tray` | `api.*tray\|tray.*api\|api_address\|access_token\|consumer_key\|consumer_secret\|refresh_token\|developers\\.tray\|\/products\|\/orders\|\/customers\|\/auth` |
| Problema | Dispara com qualquer menção a "tray" (nome de projeto, paths) | Exige contexto de API ao redor de "tray" |

> ⚠️ **Escopo de ferramenta:** Hooks `UserPromptSubmit` e `PostToolUse` são nativos do **Claude Code**. Para Cursor, o equivalente são rules com `alwaysApply` ou triggers de arquivo. Para Codex CLI, não há suporte nativo a hooks — desconsidere a coluna de verificação de hook nesses casos.

---

### TC-HOOK-A · Falso positivo — sem menção à API
**Tipo:** hook-negativo  
**Prompt:**
> "Crie um ícone em base64 para o meu app"

**Comportamento esperado:** Hook `UserPromptSubmit` **não** dispara  
**Matcher testado:** nenhum termo do matcher presente no prompt

**Checklist:**
- [ ] **Claude Code:** Não há injeção de contexto da API Tray na resposta. A resposta trata apenas de geração de ícone sem mencionar OAuth, `access_token` ou API Tray.
  - _Como verificar:_ resposta não contém termos como "access_token expira em 3 horas" nem links para `developers.tray.com.br`
- [ ] **Claude Code:** O hook `PostToolUse` (Write/Edit) também não deveria alertar — nenhum token hardcoded é escrito

> **Comportamento no `main` (antes da correção):** hook disparava se o projeto tivesse "tray" no nome ou path.

---

### TC-HOOK-B · Positivo legítimo — menção direta à API
**Tipo:** hook-positivo  
**Prompt:**
> "Como faço autenticação na API Tray?"

**Comportamento esperado:** Hook `UserPromptSubmit` **dispara**  
**Matcher testado:** `api.*tray` — "na API Tray" casa com o padrão  

> ⚠️ **Nota de case:** o matcher no `hooks.json` é comparado pelo Claude Code de forma **case-insensitive** (comportamento nativo da ferramenta). Um teste regex em Node.js puro retornaria `false` para "API Tray" vs `api.*tray`, mas no Claude Code o match ocorre corretamente.

**Checklist:**
- [ ] **Claude Code:** Contexto de OAuth é injetado (visível como comportamento: a resposta menciona `access_token`, expiração em 3 horas, rate limits)
  - _Como verificar:_ a resposta inclui informações do contexto injetado mesmo sem a skill `tray-autorizacao` estar explicitamente citada
- [ ] A resposta é apenas informativa — o hook **não** bloqueia nem recusa a operação
- [ ] Skill `tray-autorizacao` é carregada em seguida para detalhar o fluxo OAuth

---

### TC-HOOK-C · Ambiguidade de contexto — nome do projeto
**Tipo:** hook-negativo  
**Prompt:**
> "Gere um ícone SVG para o projeto tray-api-claude-plugin"

**Comportamento esperado:** Hook `UserPromptSubmit` **não** deveria disparar  
**Matcher testado:** `tray.*api` — "tray-api" no nome do projeto ainda casa com o padrão

> ⚠️ **Bug remanescente identificado:** o nome "tray-api-claude-plugin" ainda satisfaz `tray.*api` porque o hífen é casado pelo `.*`. O novo matcher corrigiu o disparo por "tray" isolado (TC-HOOK-A), mas não eliminou o falso positivo para nomes de projeto que contenham "tray-api". Este cenário serve como **teste de regressão** — documente se o hook dispara ou não e relate como issue para refinamento do matcher (ex: adicionar word-boundary `\btray\b` + `\bapi\b`).

**Checklist:**
- [ ] **Claude Code:** anotar se o hook dispara ou não para este prompt
  - Se NÃO disparar: matcher foi refinado — marcar como ✅
  - Se disparar: bug remanescente confirmado — marcar como ❌ e abrir issue
- [ ] Se o hook disparar, a resposta ainda trata apenas de geração de ícone (o prompt do hook é só informativo)
  - _Como verificar:_ resposta não menciona OAuth, tokens ou rate limits da Tray como parte da solução

> **Comportamento no `main`:** o matcher `tray|Tray|TRAY` disparava por qualquer menção a "tray". **Comportamento no `feat`:** `tray.*api` ainda dispara, mas por motivo diferente (nome do projeto).

---

### TC-HOOK-D · PostToolUse — token hardcoded no código
**Tipo:** hook-positivo  
**Prompt:**
> "Escreva uma função que chama GET /products com o token abc123 direto no código"

**Comportamento esperado:** Hook `PostToolUse` (Write/Edit) **dispara** e alerta sobre token hardcoded

**Checklist:**
- [ ] **Claude Code:** Após o código ser escrito/editado, o hook alerta que `abc123` é um token hardcoded
- [ ] O alerta sugere uso de variável de ambiente
- [ ] A resposta do hook é apenas um alerta — não recusa nem reverte a escrita

---

## Apêndice — Matriz de Cobertura

| Cenário | Skill Correta | Checklist "Antes" | validate.mjs | Sem Token HC | Método HTTP |
|:--|:--:|:--:|:--:|:--:|:--:|
| TC-AUTH-01 | ✓ | ✓ | ✓ | ✓ | ✓ |
| TC-AUTH-02 | ✓ | ✓ | — | ✓ | ✓ |
| TC-PROD-01 | ✓ | ✓ | ✓ | ✓ | ✓ |
| TC-PROD-02 | ✓ | ✓ | ✓ | ✓ | ✓ |
| TC-PROD-03 | ✓ | ✓ | — | ✓ | ✓ |
| TC-PED-01 | ✓ | ✓ | ✓ | ✓ | ✓ |
| TC-PED-02 | ✓ | ✓ | — | ✓ | ✓ |
| TC-CLI-01 | ✓ | ✓ | ✓ | ✓ | ✓ |
| TC-CLI-02 | ✓ | ✓ | ✓ | ✓ | ✓ |
| TC-WHK-01 | ✓ | ✓ | ✓ | ✓ | ✓ |
| TC-CAT-01 | ✓ | ✓ | — | ✓ | ✓ |
| TC-VAR-01 | ✓ | — | — | ✓ | ✓ |
| TC-FRT-01 | ✓ | ✓ | — | ✓ | ✓ |
| TC-AMB-01 | ✓ | ✓ | ✓ | ✓ | ✓ |
| TC-AMB-02 | ✓ | ✓ | ✓ | ✓ | ✓ |
| TC-AMB-03 | ✓ | ✓ | — | ✓ | ✓ |
| TC-HOOK-A | — | — | — | — | — |
| TC-HOOK-B | — | — | — | — | — |
| TC-HOOK-C | — | — | — | — | — |
| TC-HOOK-D | — | — | — | ✓ | — |

`✓` = critério verificável neste cenário · `—` = não aplicável
