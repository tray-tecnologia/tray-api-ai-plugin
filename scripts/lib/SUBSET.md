# Subset JSON Schema suportado pelo `validate.mjs`

Este documento define exatamente quais features do JSON Schema Draft-07 o
`validate.mjs` do plugin Tray suporta em runtime. Schemas que usam features
fora deste subset são **rejeitados** pelo `scripts/lint-schemas.mjs` e
falham no smoke-test.

A motivação é entregar validação local zero-deps (sem `npm install`),
útil ao agente que invoca o validate durante a sessão. Se um caso de uso
real exigir feature fora do subset, esta lista pode crescer — mas a regra
é: nada entra sem decisão deliberada.

## Suportado

### `$schema`
Apenas valor literal `"http://json-schema.org/draft-07/schema#"`. Ignorado
em runtime, validado pelo lint.

### `title`
String. Usada pelo CLI para desembrulhar o envelope:
```json
{ "title": "Product", "type": "object", ... }
```
faz com que `{ "Product": { ... } }` seja validado como `{ ... }`.

### `description`
String. Recomendado conter link para a doc oficial Tray.

### `type`
Aceita string ou array. Valores: `string`, `number`, `integer`, `boolean`,
`array`, `object`, `null`.

### `properties`
Mapa `nome → sub-schema`.

### `required`
Array de nomes de propriedades obrigatórias.

### `additionalProperties`
Apenas valor `false`. Quando presente, campos não declarados em `properties`
são rejeitados (com mensagem sugerindo verificar `when_not_to_use` da skill).

### `enum`
Array de valores literais aceitos.

### `maxLength`
Inteiro. Aplicado a strings.

### `minimum`
Número. Aplicado a números/integers.

### `pattern`
String com regex em sintaxe ECMAScript. Aplicado a strings.

### `format`
Validadores semânticos custom (ver `scripts/lib/formats-br.mjs`):
- `cpf` — 11 dígitos numéricos com algoritmo de DV
- `cnpj` — 14 dígitos numéricos com algoritmo de DV
- `cep` — 8 dígitos numéricos
- `ean` — GTIN-8/12/13/14 com algoritmo de DV
- `ncm` — 8 dígitos numéricos
- `date` — `YYYY-MM-DD` com calendário válido
- `datetime` — `YYYY-MM-DD HH:MM:SS` com calendário válido
- `email` — RFC simplificada
- `uri` — protocolo http/https obrigatório

## Não suportado

- `oneOf`, `anyOf`, `allOf`, `not`
- `if`, `then`, `else`
- `$ref` (cross-schema)
- `definitions`, `$defs`
- `dependencies`, `dependentRequired`, `dependentSchemas`
- `propertyNames`, `patternProperties`
- `minLength`, `maxItems`, `minItems`, `uniqueItems`
- `multipleOf`, `exclusiveMinimum`, `exclusiveMaximum`, `maximum`
- `const`
- `contentEncoding`, `contentMediaType`
- `examples`

Schema usando qualquer dessas keywords é rejeitado pelo lint com mensagem:
```
schema "produtos/produto.create.json" usa keyword fora do subset: "oneOf".
Veja scripts/lib/SUBSET.md.
```

## Como ampliar o subset

1. Adicionar a feature ao `validate-schema.mjs`.
2. Adicionar testes em `tests/validate/lib-validate.test.mjs` (válidos + inválidos).
3. Adicionar entrada na seção "Suportado" deste documento.
4. Remover entrada da seção "Não suportado" deste documento.
5. Atualizar `scripts/lint-schemas.mjs` para parar de rejeitar a keyword.
6. Garantir que `tests/validate/lint-schemas.test.mjs` reflete a mudança.
