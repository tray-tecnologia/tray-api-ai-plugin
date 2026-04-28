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
