export interface Product {
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
  sales?: number;
  ratingStar?: number;
  shopName?: string;
  shopType?: number;
  currency?: string;
}

export interface SearchResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  source: 'shopee_official_api' | 'fallback_catalog';
  queryTime: string;
  affiliateDisclaimer: string;
}

export interface AdminStatus {
  server: {
    status: string;
    uptimeSeconds: number;
    uptimeFormatted: string;
    nodeVersion: string;
    environment: string;
    memoryUsageMb: number;
  };
  credentials: {
    SHOPEE_APP_ID_CONFIGURED: boolean;
    SHOPEE_APP_SECRET_CONFIGURED: boolean;
    ADMIN_SECRET_KEY_CONFIGURED: boolean;
    appIdMasked: string | null;
    endpoint: string;
  };
  capabilities: {
    generateShortLink: boolean;
    productOfferV2: boolean;
    mcpProtocolV20241105: boolean;
    chatgptAppsSdkReady: boolean;
  };
}

export interface DiagnosticResult {
  configured: boolean;
  appIdConfigured: boolean;
  appSecretConfigured: boolean;
  endpointReachable: boolean;
  statusCode?: number;
  latencyMs?: number;
  authenticated: boolean;
  message: string;
  timestamp: string;
}

export interface LogItem {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: Record<string, unknown>;
}
