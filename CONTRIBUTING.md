# Contribuindo para o tray-api-claude-plugin

Obrigado pelo interesse em contribuir. Este plugin é mantido pela Tray e pela
comunidade de parceiros, e qualquer melhoria — correção de erro, novo recurso,
clarificação na documentação — é bem-vinda.

## Antes de abrir PR

### 1. Confira o que já existe

- [Issues abertas](https://github.com/tray-tecnologia/tray-api-claude-plugin/issues)
- [Pull requests abertos](https://github.com/tray-tecnologia/tray-api-claude-plugin/pulls)
- Documentação oficial da API: https://developers.tray.com.br

Se sua mudança for grande (novo skill, novo agente, mudança em hook), abra
**issue antes** descrevendo a proposta. Evita retrabalho se o time tiver
visão diferente.

### 2. Execute o smoke test localmente

Toda mudança precisa passar por:

```bash
npm install
npm run smoke           # valida JSON, frontmatter e payloads das skills
npm run version:check   # valida consistência de versão entre manifests
```

O CI roda os mesmos comandos em PRs (Node 20 e Node 22). PRs com smoke
quebrado não passam pelo gate.

### 3. Encontrou problema de segurança?

**Não abra issue pública.** Siga o processo de [`SECURITY.md`](SECURITY.md).

## Tipos de contribuição

### Correção de typo, link ou clarificação

PR direto na main, sem issue prévia. Smoke precisa passar.

### Nova skill (recurso da API Tray)

1. Crie pasta `skills/<slug-do-recurso>/` e `SKILL.md` dentro.
2. Frontmatter obrigatório:
   - `name` — slug com prefixo `tray-` (ex: `tray-novo-recurso`)
   - `description` — o que a skill cobre
   - `when_to_use` — palavras-chave que devem ativar a skill
   - `when_not_to_use` — quando direcionar para outra skill
3. Seção `## Antes de responder` com checklist de verificações.
4. Documente endpoints, campos obrigatórios, exemplos de payload e erros comuns.
5. Se houver POST/PUT, crie `skills/<slug>/scripts/validate.mjs` validando o
   payload (modelo: `skills/produtos/scripts/validate.mjs`).
6. Atualize a contagem em `README.md`, `AGENTS.md`,
   `.github/copilot-instructions.md` e `.claude-plugin/marketplace.json`.
7. Adicione referência à skill em:
   - `AGENTS.md` (tabela da seção apropriada)
   - `README.md` (lista de skills)
   - `.cursor/rules/tray-api.mdc` (tabela de @-mentions)
   - `.aiassistant/rules/tray-api.md` (lista por categoria)
   - `.github/copilot-instructions.md` (lista por categoria)
   - `GEMINI.md` se for skill core (caso contrário só na tabela final)

O smoke test detecta automaticamente novas skills se o frontmatter estiver
correto.

### Novo agente

1. Crie `agents/<slug>.md` com frontmatter `name` e `description`.
2. Documente quando invocar, fluxo do agente, e quais skills ele orquestra.
3. Atualize `agents/AGENTES.md` com guia de escolha.
4. Atualize tabela de agentes em `README.md` e `AGENTS.md`.

### Mudança em hook (`hooks/hooks.json`)

Hooks rodam em todas as sessões dos consumidores do plugin. Mudanças aqui
exigem:

- Issue prévia descrevendo o problema que o hook resolve.
- PR com diff mínimo.
- Aprovação de um maintainer (CODEOWNERS).
- Justificativa de por que o conteúdo do `prompt` não pode injetar instrução
  maliciosa em um agente que confia no plugin.

## Convenções de commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(skills): adiciona skill de boletos
fix(hooks): corrige escape de aspas em PostToolUse
docs(readme): clarifica passo de instalação no Cursor
chore(deps): atualiza node engines para >=20
ci: adiciona workflow de smoke
```

Tipos aceitos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`,
`perf`, `build`, `style`, `revert`.

Mensagens em português ou inglês — ambos são aceitos. Mantenha o assunto
em uma linha de até 72 caracteres; corpo no infinitivo, descrevendo o **porquê**
quando não for óbvio pelo diff.

## Versão

A versão é mantida sincronizada entre 4 arquivos:

- `package.json`
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `.cursor-plugin/plugin.json`
- `.codex-plugin/plugin.json`
- `gemini-extension.json`

Use o script para bumpar:

```bash
npm run version:set -- 1.2.0
```

Ele atualiza todos os manifests de uma vez. `npm run version:check` valida que
estão alinhados.

### Regras de SemVer

- **PATCH** (`1.1.x → 1.1.x+1`): typo, clarificação, fix em validate.mjs sem
  mudar o contrato, fix em hook sem mudar prompt.
- **MINOR** (`1.x.0 → 1.x+1.0`): nova skill, novo agente, novo comando, novo
  hook, novo manifest de plataforma.
- **MAJOR** (`x.0.0 → x+1.0.0`): remoção/renomeação de skill ou agente,
  mudança incompatível em hook ou manifest.

## Fluxo de PR

1. Fork do repositório (ou branch feature em fork interno se for time Tray).
2. Branch nomeada por convenção: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`.
3. Commits em Conventional Commits.
4. Smoke local passando.
5. PR contra `main` com:
   - Descrição clara do **problema** que o PR resolve.
   - Lista de arquivos tocados e por quê.
   - Checklist de validações executadas.
6. CI verde (smoke + version:check em Node 20 e 22).
7. Aprovação de pelo menos 1 maintainer.

## Não comite

- `.env*` com dados reais.
- Tokens, `consumer_key`, `consumer_secret`, `access_token`,
  `refresh_token` em qualquer arquivo (inclusive em exemplos — use placeholders
  como `{access_token}` ou `xxxxxxxxx`).
- Arquivos `node_modules/`, `coverage/`, `.idea/`, `.vscode/`, `dist/`.
- Documentação proprietária da Tray que não seja pública em
  https://developers.tray.com.br.

## Dúvidas

- Dúvida técnica sobre a API Tray (não sobre o plugin):
  https://developers.tray.com.br
- Dúvida sobre o plugin: abra issue com label `question`.
- Dúvida sobre processo de contribuição: comente neste arquivo via PR.

## Licença

Ao contribuir você concorda em licenciar sua contribuição sob a
[MIT License](LICENSE), mesma licença do projeto.
