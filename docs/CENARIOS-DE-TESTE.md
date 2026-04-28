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
