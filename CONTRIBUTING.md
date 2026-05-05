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
npm install              # instala devDependencies (ajv, ajv-formats)
npm test                 # roda testes (≥ 200 casos)
npm run smoke            # valida JSON, frontmatter, validate.mjs e lint-schemas
npm run version:check    # valida consistência de versão entre manifests
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
5. Se houver POST/PUT, criar **schemas multi-operação**:
   - Crie `skills/<slug>/schemas/<recurso>.create.json` (POST) e
     `skills/<slug>/schemas/<recurso>.update.json` (PUT) seguindo o
     subset documentado em `scripts/lib/SUBSET.md`.
   - Crie `skills/<slug>/scripts/validate.mjs` (CLI fino — copie de
     `skills/produtos/scripts/validate.mjs` ajustando `skillName` e
     `usageExample`).
   - Crie `tests/validate/<slug>.test.mjs` com **≥ 5 casos válidos + 5
     inválidos por operação**, incluindo pelo menos 2 testes de oracle
     AJV (use `assertOracleAgrees` de `tests/validate/helpers/ajv-oracle.mjs`).
   - Atualize o passo 5 do "Antes de responder" no `SKILL.md` listando
     os schemas e citando `--schema=<op>`.
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

### Como criar um schema novo

Antes de criar um schema, **leia** [`scripts/lib/SUBSET.md`](scripts/lib/SUBSET.md)
para saber quais features do JSON Schema Draft-07 são suportadas.

1. Decida o nome no formato `<recurso>.<operação>.json` — ex.: `produto.create`,
   `pedido.update`, `webhook.payload`. Operações típicas: `create`, `update`,
   `payload`, `request`, `refresh`.
2. Crie o arquivo em `skills/<skill>/schemas/<recurso>.<op>.json`.
3. O `title` deve ser o nome do envelope esperado pela API Tray (PascalCase
   da classe do recurso): `Product`, `Order`, `Customer`, etc. O CLI desembrulha
   automaticamente via `payload[schema.title]`.
4. Use `additionalProperties: false` por default — relaxe **só** se um bug
   real provar que a Tray aceita campos não documentados.
5. Adicione `description` em cada propriedade. O campo de descrição
   raiz deve referenciar a doc oficial: `"https://developers.tray.com.br/..."`.
6. Para campos brasileiros (CPF, CNPJ, CEP, EAN, NCM) use `format` em vez
   de `pattern` — formats já incluem algoritmo de verificação de DV.
7. Rode o lint: `node scripts/lint-schemas.mjs skills/<skill>/schemas/<recurso>.<op>.json`.
8. Rode os testes: `npm test`.
9. Atualize o passo 5 do `SKILL.md` da skill.

### Como expandir o subset suportado

O subset não cobre `oneOf`, `anyOf`, `allOf`, `$ref`, etc. Se um schema
real exigir essas features:

1. Não force — primeiro verifique se há jeito de modelar sem.
2. Se não houver, abra issue prévia com o caso de uso concreto.
3. A expansão segue o procedimento documentado no fim de
   `scripts/lib/SUBSET.md`.

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
[GPL-3.0](LICENSE), mesma licença do projeto.

## Como expandir sinônimos do `search_docs.mjs`

O dicionário em `skills/tray-dev/assets/synonyms-pt-br.json` mapeia termos PT-BR para equivalentes da API Tray. Quando uma query PT-BR óbvia retorna 0 resultados, é sinal de gap no dicionário.

### Quando adicionar/expandir um grupo

- Termo recorrente em pergunta de usuário PT-BR que não bate com vocabulário da SPA inglesa.
- Sinônimo regional (ex.: "preço" vs "preco" vs "valor").
- Termo técnico Tray específico (ex.: "consumer key" para "client id").

### Como adicionar

1. Identifique o `primary` canônico — preferencialmente o termo da API Tray (em inglês ou exatamente como aparece na SPA).
2. Adicione array `synonyms` com variações PT-BR (sem acentos, lowercase).
3. Adicione um teste em `tests/search/synonyms.test.mjs` cobrindo o novo grupo.
4. Rode `npm test` localmente.
5. Bump da `version` no JSON (`1.0.0` → `1.0.1`).

### Exemplo

```json
{
  "primary": "tax",
  "synonyms": ["imposto","icms","ipi","tributo","taxacao"]
}
```

### Não adicionar

- Sinônimos triviais já resolvidos pelo stemmer (`produto` ↔ `produtos`).
- Termos com 1 caractere (ruído).
- Tradução literal sem benefício na API Tray (ex.: `the` ↔ `o`).

## Como adicionar uma skill nova

1. **Crie a pasta** `skills/<resource>/` com `SKILL.md` (frontmatter obrigatório: `name`, `description`, `when_to_use`, `when_not_to_use`).

2. **Adicione o bloco `## MANDATORY: Tool Call(s) Required Before Answering`** logo após o `---` de fechamento do frontmatter, antes de qualquer outra seção. Use um dos 3 templates conforme o tipo de skill:

   - **Categoria A — recurso de escrita COM `validate.mjs`** (ex.: `produtos`, `pedidos`): bloco contém `search_docs.mjs` E `validate.mjs`. Veja `skills/produtos/SKILL.md`.
   - **Categoria B — recurso de escrita SEM `validate.mjs`** (ex.: `cupons`, `multicd`): bloco contém apenas `search_docs.mjs`. Veja `skills/cupons/SKILL.md`.
   - **Categoria C — recurso de leitura** (apenas GET; ex.: `usuarios`, `frete`): bloco contém apenas `search_docs.mjs`, com nota explicando que não há payload. Veja `skills/usuarios/SKILL.md`.

   O bloco DEVE conter a frase `OBRIGATÓRIAS` (ou `OBRIGATÓRIA` no singular) e o literal `node skills/tray-dev/scripts/search_docs.mjs`.

3. **Atualize o `topics-map.mjs`** se houver um novo `<TOPIC_SLUG>` (caminho: `scripts/lib/topics-map.mjs`).

4. **Para Categoria A:** crie também:
   - `skills/<resource>/scripts/validate.mjs` (espelhe outra skill A);
   - `skills/<resource>/schemas/<resource>.<operation>.json` (subset documentado em `scripts/lib/SUBSET.md`);
   - testes em `tests/validate/skills/<resource>/`.

   Veja a seção "Validação local com `validate.mjs`" deste documento.

5. **Verifique localmente:**

   ```bash
   npm test
   npm run lint:skills                # bloco MANDATORY
   node scripts/lint-schemas.mjs      # subset JSON Schema (categoria A)
   npm run smoke
   ```

   Todos devem passar. O CI roda os mesmos checks.

6. **Atualize cross-refs:**
   - `AGENTS.md` (tabela de skills)
   - `GEMINI.md`, `.cursor/rules/tray-api.mdc`, `.aiassistant/rules/tray-api.md`, `.github/copilot-instructions.md`
   - `README.md` (se for skill destacada)
   - `docs/CENARIOS-DE-TESTE.md` (cenários de teste manual)

7. **Bump de versão MINOR** (`x.Y.0`) com:

   ```bash
   npm run version:set -- <next>
   ```

   Atualize `CHANGELOG.md` com a entrada da nova versão.

## Como evoluir o servidor MCP

O servidor MCP está em `mcp/` (JS puro, sem TS, sem build). Reusa as libs em `scripts/lib/` para search e validate.

Estrutura:

- `mcp/server.mjs` — entrada (stdio).
- `mcp/tools/<tool>.mjs` — uma função por tool exposta.
- `mcp/lib/` — helpers locais (carregamento de schemas, etc).
- `tests/mcp/` — suite de testes (in-process, sem rede).

Regra invariante: **nunca** `console.log` em arquivos de `mcp/`. Stdout é o canal MCP. Use `console.error` para logs.

Para adicionar uma tool nova:

1. Criar `mcp/tools/<nome>.mjs` com `export const xxxToolDefinition` e `export async function handleXxx(input, ...)`.
2. Importar em `mcp/server.mjs` e registrar no `ListTools` + roteador `CallTool`.
3. Criar testes em `tests/mcp/tools-<nome>.test.mjs`.
4. Documentar em `mcp/README.md`.
5. Ajustar smoke seção 15 se for tool com side-effect novo.
