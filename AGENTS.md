# Tray API Plugin

Documentação ativa da API da Tray para assistentes de IA. Este repositório contém
34 skills com a documentação completa de cada recurso da plataforma Tray, fluxos
de agentes especializados e comandos de atalho.

Documentação oficial da API: https://developers.tray.com.br

---

## Regras obrigatórias para toda sessão

### Autenticação

- Fluxo: OAuth 2.0 de 3 etapas com redirect para `https://{dominio_loja}/auth.php`.
- `access_token` é passado como **query parameter** em todas as chamadas: `?access_token={token}`.
- `access_token` expira em **3 horas**; renovar via `GET /auth?consumer_key=...&refresh_token=...`.
- `refresh_token` expira em **30 dias**.
- **Nunca** escrever `access_token`, `consumer_key` ou `consumer_secret` como literais no código — usar variáveis de ambiente.

### URL e formato

- URL base: `https://{api_address}/` — o `api_address` é retornado no callback OAuth e varia por loja.
- Payloads JSON **sempre** envolvidos na chave do recurso: `{"Product": {...}}`, `{"Order": {...}}`, `{"Customer": {...}}`.
- Paginação máxima: **50 itens** por requisição (campo `pager.total` indica o total).
- Datas: `YYYY-MM-DD`; timestamps: `YYYY-MM-DD HH:MM:SS`.

### Rate limit

- **180 req/min** e **10.000 req/dia** (50.000 para contas corporate).
- Em operações em lote: processar 150 itens por batch com pausa de 60 s entre batches.
- Tratar `HTTP 429` com retry exponencial.

### Dados brasileiros

- CPF: 11 dígitos, validar com algoritmo de verificação antes de enviar.
- CNPJ: 14 dígitos, idem.
- CEP: 8 dígitos numéricos.
- EAN: código de barras válido.
- NCM: 8 dígitos de classificação fiscal.

---

## Skills disponíveis

Leia o `SKILL.md` do recurso antes de gerar código. Cada skill contém endpoints,
campos, exemplos e erros comuns.

### Autenticação e infraestrutura

| Skill | Arquivo | Quando usar |
|-------|---------|-------------|
| Autorização / OAuth | `skills/autorizacao/SKILL.md` | OAuth, access_token, refresh_token, erro 401 |
| Webhooks | `skills/webhooks/SKILL.md` | Notificações, eventos, listeners, sincronização em tempo real |
| Informações da loja | `skills/informacoes-loja/SKILL.md` | Dados da loja, api_address, plano, domínio |
| Usuários administrativos | `skills/usuarios/SKILL.md` | Listar usuários da loja |
| Scripts externos | `skills/scripts-externos/SKILL.md` | JavaScript na vitrine, pixels de rastreio |

### Catálogo

| Skill | Arquivo | Quando usar |
|-------|---------|-------------|
| Produtos | `skills/produtos/SKILL.md` | CRUD de produtos, preço, estoque, EAN, NCM |
| Variações / SKUs | `skills/variacoes/SKILL.md` | Tamanho, cor, modelo, estoque por variação |
| Imagens de produtos | `skills/imagens-produtos/SKILL.md` | Upload, ordenação, remoção de imagens |
| Categorias | `skills/categorias/SKILL.md` | Árvore de categorias, subcategorias |
| Marcas | `skills/marcas/SKILL.md` | Fabricantes, brand_id |
| Kits | `skills/kits/SKILL.md` | Combos, bundles, produtos compostos |
| Características | `skills/caracteristicas/SKILL.md` | Atributos técnicos customizados |
| Informações adicionais | `skills/informacoes-adicionais/SKILL.md` | Campos extra em produtos |

### Pedidos e logística

| Skill | Arquivo | Quando usar |
|-------|---------|-------------|
| Pedidos | `skills/pedidos/SKILL.md` | Ciclo completo de pedidos, cancelamento |
| Status de pedido | `skills/status-pedido/SKILL.md` | Status customizados, pipeline de pedido |
| Notas fiscais | `skills/notas-fiscais/SKILL.md` | NF-e, DANFE, integração com ERP |
| Frete | `skills/frete/SKILL.md` | Cálculo de frete, cotação por CEP |
| Configuração de frete | `skills/configuracao-frete/SKILL.md` | Métodos de envio, tabelas de CEP/peso |
| Etiquetas HUB | `skills/etiquetas-hub/SKILL.md` | Etiquetas via sistema HUB |
| Etiquetas Mercado Livre | `skills/etiquetas-mercado-livre/SKILL.md` | Etiquetas de pedidos ML |
| Emissores de etiqueta | `skills/emissores-etiqueta/SKILL.md` | Cadastro de URLs de etiqueta |
| Multi-CD | `skills/multicd/SKILL.md` | Centros de distribuição, estoque por CD |
| Carrinho de compras | `skills/carrinho-compras/SKILL.md` | CRUD de carrinhos |
| Listagem de carrinhos | `skills/listagem-carrinho/SKILL.md` | Listar carrinhos em massa |

### Clientes e pagamentos

| Skill | Arquivo | Quando usar |
|-------|---------|-------------|
| Clientes | `skills/clientes/SKILL.md` | CRUD de clientes, CPF, CNPJ |
| Endereços de cliente | `skills/enderecos-cliente/SKILL.md` | Endereços de entrega e cobrança |
| Perfis de cliente | `skills/perfis-cliente/SKILL.md` | Segmentos, grupos, B2B vs B2C |
| Pagamentos | `skills/pagamentos/SKILL.md` | Meios de pagamento, PIX, boleto, cartão |
| Cupons de desconto | `skills/cupons/SKILL.md` | Códigos promocionais, regras de desconto |
| Listas de preço B2B | `skills/listas-preco-b2b/SKILL.md` | Preços diferenciados por cliente |
| Newsletter | `skills/newsletter/SKILL.md` | Assinantes, opt-in de e-mail |

### Analytics e outros

| Skill | Arquivo | Quando usar |
|-------|---------|-------------|
| Produtos vendidos | `skills/produtos-vendidos/SKILL.md` | Histórico de vendas, mais vendidos |
| Palavras-chave | `skills/palavras-chave/SKILL.md` | SEO, termos buscados na loja |
| Parceiros | `skills/parceiros/SKILL.md` | Revendedores, canais de venda |

---

## Agentes especializados

Para tarefas complexas, use o agente apropriado em `agents/`:

| Agente | Arquivo | Quando usar |
|--------|---------|-------------|
| Configuração de aplicativo | `agents/configuracao-aplicativo.md` | Setup inicial, OAuth, primeiras credenciais |
| Gestor de catálogo | `agents/gestor-catalogo.md` | Criação/atualização em massa de produtos |
| Gestor de pedidos | `agents/gestor-pedidos.md` | Ciclo de pedidos, NF-e, etiquetas |
| Debug de integração | `agents/debug-integracao.md` | Diagnóstico de erros, 401, 429, respostas inesperadas |
| Assistente de migração | `agents/assistente-migracao.md` | Migrar dados de Shopify, WooCommerce, Magento, VTEX, Nuvemshop |

---

## Comandos disponíveis

| Comando | Arquivo | O que faz |
|---------|---------|-----------|
| Setup | `commands/setup.md` | Guia de configuração inicial passo a passo |
| Referência da API | `commands/referencia-api.md` | Índice de todos os endpoints |
| Validar integração | `commands/validar-integracao.md` | Checklist antes de publicar na Tray |
