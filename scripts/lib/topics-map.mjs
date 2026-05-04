export const TOPICS_MAP = {
  'autorizacao': 'Autorização',
  'produtos': 'API de Produtos',
  'pedidos': 'APIs de Pedidos',
  'clientes': 'API de Clientes',
  'webhooks': 'APIs de Sistema de Notificação(Webhook)',
  'variacoes': 'APIs de Variação de Produtos',
  'categorias': 'API de Categorias',
  'marcas': 'API de Marca do Produto',
  'cupons': 'API de Cupom',
  'multicd': 'API de Multicd',
  'frete': 'API de Integração de Frete',
  'pagamentos': 'APIs de Informações de Pagamento',
  'notas-fiscais': 'API de Nota Fiscal',
  'status-pedido': 'API de Status do Pedido',
  'kits': 'API de Kit',
  'caracteristicas': 'APIs de Características',
  'informacoes-loja': 'APIs de Informações da Loja',
  'carrinho-compras': 'APIs de Carrinho de Compra',
  'listagem-carrinho': 'Novo API de Listagem de Carrinho',
  'listas-preco-b2b': 'API de Lista de Preço B2B',
  'usuarios': 'APIs de Usuário',
  'parceiros': 'APIs de Parceiros',
  'palavras-chave': 'APIs de Palavras-Chave',
  'newsletter': 'APIs de Newsletter',
  'produtos-vendidos': 'APIs de Produtos Vendidos',
  'imagens-produtos': 'APIs de imagens de produtos e variações',
  'informacoes-adicionais': 'API de Informação Adicional (additional_info)',
  'etiquetas-hub': 'API de etiquetas do HUB',
  'etiquetas-mercado-livre': 'API de Etiqueta do Mercado Livre',
  'emissores-etiqueta': 'API de Emissores de Etiqueta',
  'configuracao-frete': 'API de Configuração de Forma de Frete',
  'scripts-externos': 'APIs de Scripts Externos',
  'como-integrar': 'Como Integrar',
  'homologacao': 'Homologação do aplicativo',
  'suporte': 'Suporte Técnico'
};

export function topicToH1(slug) {
  return TOPICS_MAP[slug] ?? null;
}

export function h1ToTopic(h1) {
  for (const [slug, name] of Object.entries(TOPICS_MAP)) {
    if (name === h1) return slug;
  }
  return null;
}

export function listTopics() {
  return Object.keys(TOPICS_MAP).sort();
}
