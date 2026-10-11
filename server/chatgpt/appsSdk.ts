import { ShopeeProductOffer } from '../shopee/types.ts';

export const CHATGPT_APP_METADATA = {
  app_id: 'busca-busca-shopee',
  name: 'Busca Busca',
  description: 'Pesquise produtos e descubra as melhores ofertas da Shopee com links de afiliado oficiais.',
  version: '1.0.0',
  developer: 'Busca Busca Team',
  homepage: 'https://affiliate.shopee.com.br',
  capabilities: {
    widgets: true,
    actions: true,
  },
};

/**
 * Constrói payload estruturado compatível com o OpenAI Apps SDK para renderização
 * de cartões visuais nativos no chat.
 */
export function buildChatGPTProductWidget(
  products: ShopeeProductOffer[],
  queryText: string,
  affiliateDisclaimer: string
) {
  return {
    $schema: 'https://developers.openai.com/schemas/apps-sdk/widget.json',
    widget_type: 'product_carousel_or_grid',
    title: `Resultados Busca Busca para: "${queryText}"`,
    disclaimer: affiliateDisclaimer,
    items: products.map(product => ({
      id: product.itemId,
      title: product.productName,
      image_url: product.imageUrl,
      price: {
        current: product.price,
        original: product.priceMax && product.priceMax > product.price ? product.priceMax : undefined,
        currency: 'BRL',
        formatted: `R$ ${product.price.toFixed(2).replace('.', ',')}`,
        discount_percentage: product.priceDiscountRate ? `${product.priceDiscountRate}% OFF` : undefined,
      },
      seller: {
        name: product.shopName || 'Shopee Brasil',
        is_official: product.shopType === 1,
      },
      metrics: {
        sales: product.sales ? `${product.sales.toLocaleString('pt-BR')} vendidos` : undefined,
        rating: product.ratingStar ? `★ ${product.ratingStar.toFixed(1)}` : undefined,
      },
      actions: [
        {
          type: 'button',
          label: 'Ver Oferta na Shopee',
          variant: 'primary',
          url: product.offerLink || product.productLink,
          is_affiliate_link: true,
        },
      ],
    })),
  };
}
