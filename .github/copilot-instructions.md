# Tray API Plugin

Documentação ativa da API da Tray para integração com GitHub Copilot.
Este repositório contém a documentação completa de 150+ endpoints organizados
em 34 skills, agentes especializados e fluxos de integração.

Documentação oficial: https://developers.tray.com.br

---

## Regras obrigatórias para toda integração Tray

### Autenticação OAuth 2.0

- Fluxo de 3 etapas com redirect para `https://{dominio_loja}/auth.php`.
- `access_token` passado como query parameter: `?access_token={token}`.
- `access_token` expira em **3 horas**; renovar com `refresh_token` (válido 30 dias).
- **Nunca** escrever `access_token`, `consumer_key` ou `consumer_secret` como literais — usar variáveis de ambiente.

### Formato de requisições

- URL base: `https://{api_address}/` — `api_address` retornado no callback OAuth.
- Payload JSON sempre envolto na chave do recurso: `{"Product": {...}}`, `{"Order": {...}}`.
- Paginação máxima: **50 itens** por requisição.
- Datas: `YYYY-MM-DD`; timestamps: `YYYY-MM-DD HH:MM:SS`.

### Rate limit

- **180 req/min** e **10.000 req/dia** (50.000 para contas corporate).
- Tratar `HTTP 429` com retry exponencial.
- Em lotes: 150 itens por batch com pausa de 60 s.

### Validações brasileiras

- CPF (11 dígitos) e CNPJ (14 dígitos) — validar antes de enviar.
- CEP: 8 dígitos numéricos.

---

## Documentação por recurso

Antes de gerar código para um recurso da Tray, consulte o skill correspondente
neste repositório:

### Autenticação e infraestrutura
- OAuth 2.0, tokens: `skills/autorizacao/SKILL.md`
- Webhooks / notificações: `skills/webhooks/SKILL.md`
- Dados da loja: `skills/informacoes-loja/SKILL.md`
- Scripts na vitrine: `skills/scripts-externos/SKILL.md`
- Usuários admin: `skills/usuarios/SKILL.md`

### Catálogo
- Produtos: `skills/produtos/SKILL.md`
- Variações / SKUs: `skills/variacoes/SKILL.md`
- Imagens: `skills/imagens-produtos/SKILL.md`
- Categorias: `skills/categorias/SKILL.md`
- Marcas: `skills/marcas/SKILL.md`
- Kits / combos: `skills/kits/SKILL.md`
- Características: `skills/caracteristicas/SKILL.md`
- Campos extras: `skills/informacoes-adicionais/SKILL.md`

### Pedidos e logística
- Pedidos: `skills/pedidos/SKILL.md`
- Status: `skills/status-pedido/SKILL.md`
- Notas fiscais: `skills/notas-fiscais/SKILL.md`
- Frete (cálculo): `skills/frete/SKILL.md`
- Frete (configuração): `skills/configuracao-frete/SKILL.md`
- Etiquetas HUB: `skills/etiquetas-hub/SKILL.md`
- Etiquetas ML: `skills/etiquetas-mercado-livre/SKILL.md`
- Emissores de etiqueta: `skills/emissores-etiqueta/SKILL.md`
- Multi-CD: `skills/multicd/SKILL.md`
- Carrinho: `skills/carrinho-compras/SKILL.md`

### Clientes e pagamentos
- Clientes: `skills/clientes/SKILL.md`
- Endereços: `skills/enderecos-cliente/SKILL.md`
- Perfis: `skills/perfis-cliente/SKILL.md`
- Pagamentos: `skills/pagamentos/SKILL.md`
- Cupons: `skills/cupons/SKILL.md`
- Preços B2B: `skills/listas-preco-b2b/SKILL.md`

### Analytics e outros
- Vendas: `skills/produtos-vendidos/SKILL.md`
- SEO: `skills/palavras-chave/SKILL.md`
- Parceiros: `skills/parceiros/SKILL.md`
- Newsletter: `skills/newsletter/SKILL.md`

---

## Agentes para fluxos complexos

- Setup e OAuth: `agents/configuracao-aplicativo.md`
- Gestão de catálogo: `agents/gestor-catalogo.md`
- Gestão de pedidos: `agents/gestor-pedidos.md`
- Debug de integração: `agents/debug-integracao.md`
- Migração de plataforma: `agents/assistente-migracao.md`
