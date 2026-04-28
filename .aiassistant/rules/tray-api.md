# Tray API Plugin

Documentação ativa da API da Tray para o JetBrains AI Assistant.
Aplique estas regras quando o desenvolvedor trabalhar com qualquer integração
à plataforma Tray.

Documentação oficial: https://developers.tray.com.br

---

## Regras obrigatórias

### Autenticação

- Fluxo OAuth 2.0 de 3 etapas com redirect para `https://{dominio_loja}/auth.php`.
- `access_token` como query parameter: `?access_token={token}`.
- `access_token` expira em **3 horas**; `refresh_token` expira em **30 dias**.
- Renovar via `GET /auth?consumer_key=...&refresh_token=...`.
- Nunca escrever `access_token`, `consumer_key` ou `consumer_secret` como literais.

### Formato

- URL base: `https://{api_address}/` — varia por loja, retornada no callback OAuth.
- Payload JSON envolto na chave do recurso: `{"Product": {...}}`, `{"Order": {...}}`.
- Paginação máxima: 50 itens. Rate limit: 180 req/min, 10.000/dia.
- Datas: `YYYY-MM-DD`; timestamps: `YYYY-MM-DD HH:MM:SS`.

---

## Skills por recurso

Leia o arquivo correspondente antes de gerar código:

**Autenticação e infra**
- OAuth: `skills/autorizacao/SKILL.md`
- Webhooks: `skills/webhooks/SKILL.md`
- Loja: `skills/informacoes-loja/SKILL.md`
- Scripts na vitrine: `skills/scripts-externos/SKILL.md`
- Usuários: `skills/usuarios/SKILL.md`

**Catálogo**
- Produtos: `skills/produtos/SKILL.md`
- Variações: `skills/variacoes/SKILL.md`
- Imagens: `skills/imagens-produtos/SKILL.md`
- Categorias: `skills/categorias/SKILL.md`
- Marcas: `skills/marcas/SKILL.md`
- Kits: `skills/kits/SKILL.md`
- Características: `skills/caracteristicas/SKILL.md`
- Campos extras: `skills/informacoes-adicionais/SKILL.md`

**Pedidos e logística**
- Pedidos: `skills/pedidos/SKILL.md`
- Status: `skills/status-pedido/SKILL.md`
- NF-e: `skills/notas-fiscais/SKILL.md`
- Frete: `skills/frete/SKILL.md`
- Config. frete: `skills/configuracao-frete/SKILL.md`
- Etiquetas HUB: `skills/etiquetas-hub/SKILL.md`
- Etiquetas ML: `skills/etiquetas-mercado-livre/SKILL.md`
- Emissores: `skills/emissores-etiqueta/SKILL.md`
- Multi-CD: `skills/multicd/SKILL.md`
- Carrinho: `skills/carrinho-compras/SKILL.md`
- Listagem carrinho: `skills/listagem-carrinho/SKILL.md`

**Clientes e pagamentos**
- Clientes: `skills/clientes/SKILL.md`
- Endereços: `skills/enderecos-cliente/SKILL.md`
- Perfis: `skills/perfis-cliente/SKILL.md`
- Pagamentos: `skills/pagamentos/SKILL.md`
- Cupons: `skills/cupons/SKILL.md`
- Preços B2B: `skills/listas-preco-b2b/SKILL.md`
- Newsletter: `skills/newsletter/SKILL.md`

**Analytics**
- Vendas: `skills/produtos-vendidos/SKILL.md`
- SEO: `skills/palavras-chave/SKILL.md`
- Parceiros: `skills/parceiros/SKILL.md`

---

## Agentes disponíveis

- Setup/OAuth: `agents/configuracao-aplicativo.md`
- Catálogo: `agents/gestor-catalogo.md`
- Pedidos: `agents/gestor-pedidos.md`
- Debug: `agents/debug-integracao.md`
- Migração: `agents/assistente-migracao.md`
