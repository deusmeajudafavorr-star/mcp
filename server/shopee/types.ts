/**
 * Tipos e interfaces para a integração com a API Oficial de Afiliados da Shopee
 * Documentação: https://affiliate.shopee.com.br/open_api/home
 */

export interface ShopeeCredentials {
  appId: string;
  appSecret: string;
}

export interface ShopeeProductOffer {
  itemId: string;
  productName: string;
  price: number;
  priceMin?: number;
  priceMax?: number;
  priceDiscountRate?: number;
  imageUrl: string;
  productLink: string;
  offerLink?: string;
  commissionRate?: number;
  sellerCommissionRate?: number;
  shopeeCommissionRate?: number;
  commission?: number;
  sales?: number;
  ratingStar?: number;
  shopId?: string;
  shopName?: string;
  shopType?: number;
  currency?: string;
}

export interface ShopeeSearchResponse {
  products: ShopeeProductOffer[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  source: 'shopee_official_api' | 'fallback_catalog';
  queryTime: string;
  affiliateDisclaimer: string;
}

export interface ShopeeShortLinkInput {
  originUrl: string;
  subIds?: string[];
}

export interface ShopeeShortLinkResponse {
  success: boolean;
  originUrl: string;
  shortLink?: string;
  subIds?: string[];
  generatedAt: string;
  affiliateDisclaimer: string;
  error?: string;
}

export interface ShopeeDiagnosticResult {
  configured: boolean;
  appIdConfigured: boolean;
  appSecretConfigured: boolean;
  endpointReachable: boolean;
  statusCode?: number;
  latencyMs?: number;
  authenticated: boolean;
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: Record<string, unknown>;
}
