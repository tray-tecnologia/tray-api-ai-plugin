---
name: tray-visao-geral
description: >
  Skill de entrada para qualquer trabalho de integração com a API da Tray.
  Estabelece as regras invariantes da plataforma (OAuth como query param,
  payloads envolvidos na chave do recurso, expiração de tokens, rate limit,
  validação de dados brasileiros) e orienta para a skill específica do recurso.
  Sempre carregue esta skill antes de gerar código contra a API Tray.
when_to_use: >
  Use no início de qualquer conversa sobre API Tray, integração com Tray,
  cadastro de produtos/pedidos/clientes na Tray, OAuth da Tray, webhooks da
  Tray, ou quando o desenvolvedor mencionar consumer_key, consumer_secret,
  access_token, refresh_token, api_address ou developers.tray.com.br. Carregue
  antes da skill específica do recurso.
when_not_to_use: >
  Não use quando a pergunta não envolver a API ou plataforma Tray. Para
  detalhes específicos de um recurso (produtos, pedidos, clientes, frete,
  etc.) carregue esta skill em conjunto com a skill do recurso, não isolada.
---

## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme que o pedido envolve a API Tray (não confunda com outras APIs
   de e-commerce). Se não for Tray, redirecione.
2. Identifique o recurso (produto, pedido, cliente, frete, etc.) e
   carregue a skill específica antes de responder com detalhes.
3. Verifique que `access_token`, `consumer_key`, `consumer_secret` e
   `refresh_token` **não** aparecem como literais no código gerado.
4. Confirme que o payload, se houver, está envolvido na chave do recurso
   (`{"Product": {...}}`, `{"Order": {...}}`, `{"Customer": {...}}`).
5. Confirme que o `access_token` é passado como **query parameter**
   (`?access_token={token}`), nunca como header.

# Visão Geral — API Tray

Documentação oficial: https://developers.tray.com.br

## Regras invariantes da plataforma

Estas regras valem para **toda** chamada à API Tray e devem ser aplicadas
mesmo que a skill do recurso específico não as repita.

### 1. Autenticação OAuth 2.0

| Token | Vida útil | Como renovar |
|:--|:--|:--|
| `access_token` | 3 horas | `GET /auth?consumer_key=...&refresh_token=...` |
| `refresh_token` | 30 dias | Refazer fluxo OAuth completo |

- Sempre passado como **query parameter**: `?access_token={token}`.
- **Nunca** como header (`Authorization: Bearer ...` não funciona na API Tray).
- **Nunca** hardcoded no código — sempre via variável de ambiente.

Detalhes do fluxo de 3 etapas em [`skills/autorizacao/SKILL.md`](../autorizacao/SKILL.md).

### 2. URL base por loja

```
https://{api_address}/<recurso>?access_token={token}
```

`api_address` **varia por loja** e é retornado no callback OAuth da
Etapa 2. Armazene junto com os tokens.

### 3. Formato de payload

Payloads JSON em `POST` e `PUT` são **sempre** envolvidos na chave do
recurso, em PascalCase singular:

```json
POST /products
{ "Product": { "name": "Camiseta", "price": "99.90" } }

POST /orders
{ "Order": { "client_id": 1, "products": [...] } }

POST /customers
{ "Customer": { "name": "João Silva", "cpf": "12345678901" } }
```

Esquecer essa chave é a causa #1 de erro `HTTP 400` na API Tray.

### 4. Paginação e datas

- Máximo **50 itens** por página em listagens. Use `pager.total` da
  resposta para paginar.
- Datas: `YYYY-MM-DD`.
- Timestamps: `YYYY-MM-DD HH:MM:SS` (sem timezone — assume horário de Brasília).

### 5. Rate limit

| Limite | Valor padrão | Corporate |
|:--|:--|:--|
| Curto prazo | 180 req/min | 180 req/min |
| Diário | 10.000 req/dia | 50.000 req/dia |

- Em operações em lote: **150 itens por batch com pausa de 60 s**.
- `HTTP 429` exige backoff exponencial (1s, 2s, 4s, 8s...).

### 6. Dados brasileiros

Antes de enviar à API, valide:

| Campo | Formato | Observação |
|:--|:--|:--|
| CPF | 11 dígitos | Validar dígitos verificadores |
| CNPJ | 14 dígitos | Validar dígitos verificadores |
| CEP | 8 dígitos numéricos | Sem traço |
| EAN | Código de barras válido | GTIN-8/12/13/14 |
| NCM | 8 dígitos | Classificação fiscal |

## Fluxo recomendado para o agente

```
pedido do dev sobre API Tray
        ↓
identifique o recurso (produtos, pedidos, clientes, frete...)
        ↓
carregue a skill específica do recurso (skills/<recurso>/SKILL.md)
        ↓
aplique as 6 regras desta skill em conjunto com a do recurso
        ↓
se houver scripts/validate.mjs no recurso, valide o payload antes de retornar
        ↓
gere o código com tokens via env, payload com chave do recurso,
access_token como query param
```

## Skills por área

Carregue a skill do recurso correspondente:

| Área | Skills |
|:--|:--|
| Autenticação | `tray-autorizacao`, `tray-webhooks` |
| Catálogo | `tray-produtos`, `tray-variacoes`, `tray-imagens-produtos`, `tray-categorias`, `tray-marcas`, `tray-kits`, `tray-caracteristicas`, `tray-informacoes-adicionais` |
| Pedidos e logística | `tray-pedidos`, `tray-status-pedido`, `tray-notas-fiscais`, `tray-frete`, `tray-configuracao-frete`, `tray-multicd`, `tray-carrinho-compras`, `tray-listagem-carrinho`, `tray-etiquetas-hub`, `tray-etiquetas-mercado-livre`, `tray-emissores-etiqueta` |
| Clientes e pagamentos | `tray-clientes`, `tray-enderecos-cliente`, `tray-perfis-cliente`, `tray-pagamentos`, `tray-cupons`, `tray-listas-preco-b2b`, `tray-newsletter` |
| Loja e analytics | `tray-informacoes-loja`, `tray-usuarios`, `tray-scripts-externos`, `tray-produtos-vendidos`, `tray-palavras-chave`, `tray-parceiros` |

Para tarefas complexas que cruzam múltiplos recursos, use os agentes
especializados em `agents/` (configuração, gestão de catálogo, gestão
de pedidos, debug, migração).

## Erros mais comuns e como evitar

| Sintoma | Causa provável | Correção |
|:--|:--|:--|
| `HTTP 400` campo obrigatório ausente | Faltou a chave do recurso (`{"Product": {...}}`) ou campo obrigatório | Reler skill do recurso; rodar `validate.mjs` |
| `HTTP 401` Unauthorized | `access_token` expirado (3h) ou em header em vez de query param | Renovar via `refresh_token`; mover para query param |
| `HTTP 404` em endpoint válido | URL base errada (`api_address` é por loja) | Usar `api_address` retornado no callback OAuth |
| `HTTP 429` Too Many Requests | Rate limit (180 req/min ou 10k/dia) | Backoff exponencial; reduzir batch size para 150 |
| Resposta inesperada em listagem | Esperando todos os itens em uma chamada | Paginação máxima é 50 — ler `pager.total` |
