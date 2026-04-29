# Política de Segurança

Este plugin é distribuído publicamente e executado por agentes de IA com
acesso a credenciais reais de lojas Tray (`access_token`, `consumer_key`,
`consumer_secret`). Tratamos relatos de vulnerabilidade com prioridade.

## Como reportar

Encontrou um problema de segurança? **Não abra issue pública.**

Use uma das opções privadas abaixo, em ordem de preferência:

1. **GitHub Private Vulnerability Reporting** (recomendado): aba
   `Security → Report a vulnerability` no repositório
   [`tray-tecnologia/tray-api-claude-plugin`](https://github.com/tray-tecnologia/tray-api-claude-plugin/security/advisories/new).
2. **E-mail direto:** `rmoraes@tray.net.br` com o assunto
   `[SECURITY] tray-api-claude-plugin`.

Inclua, na medida do possível:

- Descrição do problema e impacto estimado.
- Passos para reproduzir (versão do plugin, ferramenta de IA, sistema operacional).
- PoC ou trecho de código, se aplicável.
- Sugestão de correção (opcional).

## SLA de resposta

Operamos como um time pequeno. Os prazos abaixo são compromisso de
**primeiro contato** — não de correção publicada.

| Severidade | Primeiro contato |
|:--|:--|
| Crítica (ex: prompt injection com exfiltração de tokens) | até 48h úteis |
| Alta (ex: execução arbitrária via PR malicioso aprovado) | até 5 dias úteis |
| Média / Baixa | até 10 dias úteis |

Após o contato inicial, alinhamos prazo de correção e janela de
divulgação coordenada com o reporter.

## Escopo

Este processo cobre vulnerabilidades em:

- **Hooks** (`hooks/hooks.json`) — prompts injetados em `PostToolUse`,
  `UserPromptSubmit`, `SessionStart`.
- **Scripts executáveis** (`scripts/*.js`, `scripts/lib/*`,
  `skills/*/scripts/validate.mjs`).
- **Manifests de distribuição** (`.claude-plugin/`, `.cursor-plugin/`,
  `.codex-plugin/`, `gemini-extension.json`, `package.json`).
- **Conteúdo de prompt** em `skills/*/SKILL.md`, `agents/*.md`,
  `commands/*.md`, `AGENTS.md`, `GEMINI.md`,
  `.github/copilot-instructions.md` — qualquer instrução que possa ser
  interpretada por um agente para realizar ação maliciosa (prompt
  injection, exfiltração de credenciais, etc.).

## Fora de escopo

- Vulnerabilidades em dependências transitivas — reporte ao upstream
  apropriado e nos avise se afetar este plugin.
- Bugs funcionais sem impacto de segurança — abra issue pública normal.
- Problemas na própria API Tray ou na plataforma Tray — reporte em
  https://developers.tray.com.br.

## Divulgação responsável

Pedimos que o reporter aguarde correção antes de divulgação pública.
Após o fix:

- Publicamos GitHub Security Advisory com CVE/GHSA quando aplicável.
- Creditamos o reporter no advisory (a menos que prefira anonimato).
- Listamos o fix no `CHANGELOG.md` da release que o contém.
