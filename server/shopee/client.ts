import crypto from 'node:crypto';
import {
  ShopeeProductOffer,
  ShopeeSearchResponse,
  ShopeeShortLinkResponse,
  ShopeeDiagnosticResult,
} from './types.ts';
import { validateShopeeUrl, logSecurityEvent } from './security.ts';

const SHOPEE_GRAPHQL_ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql';
const AFFILIATE_DISCLAIMER =
  'Este é um link de afiliado. Podemos receber comissão por compras elegíveis, sem custo adicional para você.';

// Produtos de exemplo verificados para demonstração inicial enquanto o usuário configura suas chaves
const SAMPLE_VERIFIED_OFFERS: ShopeeProductOffer[] = [
  {
    itemId: '18392104921',
    productName: 'Fone de Ouvido Bluetooth Sem Fio TWS com Cancelamento de Ruído e Microfone',
    price: 49.90,
    priceMin: 49.90,
    priceMax: 89.90,
    priceDiscountRate: 44,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=60',
    productLink: 'https://shopee.com.br/product/18392104921',
    offerLink: 'https://shope.ee/sample-tws-49',
    commissionRate: 8.5,
    sales: 12500,
    ratingStar: 4.8,
    shopName: 'Áudio & Tech Store Oficial',
    shopType: 1,
    currency: 'BRL',
  },
  {
    itemId: '20491823901',
    productName: 'Mouse Gamer Ergonômico RGB 7 Botões 7200 DPI com Cabo Trançado Reforçado',
    price: 35.80,
    priceMin: 35.80,
    priceMax: 59.90,
    priceDiscountRate: 40,
    imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format&fit=crop&q=60',
    productLink: 'https://shopee.com.br/product/20491823901',
    offerLink: 'https://shope.ee/sample-mouse-rgb',
    commissionRate: 9.0,
    sales: 8400,
    ratingStar: 4.7,
    shopName: 'Gaming Arena Brasil',
    shopType: 1,
    currency: 'BRL',
  },
  {
    itemId: '22839401923',
    productName: 'Suporte Articulado de Mesa para Notebook e Tablet Alumínio Dobrável Ergonômico',
    price: 39.90,
    priceMin: 39.90,
    priceMax: 65.00,
    priceDiscountRate: 38,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&auto=format&fit=crop&q=60',
    productLink: 'https://shopee.com.br/product/22839401923',
    offerLink: 'https://shope.ee/sample-suporte-desk',
    commissionRate: 10.0,
    sales: 15300,
    ratingStar: 4.9,
    shopName: 'Home Office Pro',
    shopType: 1,
    currency: 'BRL',
  },
  {
    itemId: '19203948571',
    productName: 'Teclado Mecânico Compacto 60% RGB Switch Blue/Red Conexão USB-C Destacável',
    price: 119.90,
    priceMin: 119.90,
    priceMax: 179.90,
    priceDiscountRate: 33,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=60',
    productLink: 'https://shopee.com.br/product/19203948571',
    offerLink: 'https://shope.ee/sample-teclado-mecanico',
    commissionRate: 7.5,
    sales: 4200,
    ratingStar: 4.8,
    shopName: 'Periféricos Express',
    shopType: 1,
    currency: 'BRL',
  },
  {
    itemId: '21094837261',
    productName: 'Carregador Rápido 30W USB-C PD 3.0 + USB-A Quick Charge para iPhone e Android',
    price: 29.90,
    priceMin: 29.90,
    priceMax: 49.90,
    priceDiscountRate: 40,
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=60',
    productLink: 'https://shopee.com.br/product/21094837261',
    offerLink: 'https://shope.ee/sample-carregador-30w',
    commissionRate: 11.0,
    sales: 32000,
    ratingStar: 4.9,
    shopName: 'Eletrônicos & Cabos Brasil',
    shopType: 1,
    currency: 'BRL',
  },
  {
    itemId: '23984719283',
    productName: 'Mochila Impermeável Anti-furto para Notebook 15.6 com Entrada USB e Bolsos Ocultos',
    price: 79.90,
    priceMin: 79.90,
    priceMax: 129.90,
    priceDiscountRate: 38,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60',
    productLink: 'https://shopee.com.br/product/23984719283',
    offerLink: 'https://shope.ee/sample-mochila-tech',
    commissionRate: 8.0,
    sales: 6800,
    ratingStar: 4.8,
    shopName: 'Bolsas & Malas Brasil',
    shopType: 1,
    currency: 'BRL',
  },
];

export class ShopeeAffiliateClient {
  private appId: string;
  private appSecret: string;

  constructor() {
    this.appId = process.env.SHOPEE_APP_ID?.trim() || '';
    this.appSecret = process.env.SHOPEE_APP_SECRET?.trim() || '';
  }

  /**
   * Recarrega variáveis de ambiente caso tenham sido alteradas em runtime
   */
  public reloadCredentials(): void {
    this.appId = process.env.SHOPEE_APP_ID?.trim() || '';
    this.appSecret = process.env.SHOPEE_APP_SECRET?.trim() || '';
  }

  /**
   * Verifica se as credenciais mínimas estão configuradas
   */
  public isConfigured(): boolean {
    return Boolean(this.appId && this.appSecret && this.appId.length > 2 && this.appSecret.length > 5);
  }

  /**
   * Retorna o status de configuração de forma segura (sem vazar segredos)
   */
  public getConfigurationStatus() {
    return {
      configured: this.isConfigured(),
      appIdConfigured: Boolean(this.appId && this.appId.length > 0),
      appSecretConfigured: Boolean(this.appSecret && this.appSecret.length > 0),
      appIdMasked: this.appId ? `${this.appId.slice(0, 3)}***${this.appId.slice(-2)}` : null,
      endpoint: SHOPEE_GRAPHQL_ENDPOINT,
    };
  }

  /**
   * Calcula a assinatura SHA256 conforme documentado na API da Shopee:
   * Assinatura = SHA256(AppId + Timestamp + Payload + Secret)
   * Header: Authorization: SHA256 Credential={AppId}, Timestamp={Timestamp}, Signature={Signature}
   */
  public generateAuthHeader(payload: string): { authHeader: string; timestamp: number; signature: string } {
    const timestamp = Math.floor(Date.now() / 1000);
    const factor = `${this.appId}${timestamp}${payload}${this.appSecret}`;
    const signature = crypto.createHash('sha256').update(factor).digest('hex');
    const authHeader = `SHA256 Credential=${this.appId}, Timestamp=${timestamp}, Signature=${signature}`;

    return { authHeader, timestamp, signature };
  }

  /**
   * Executa uma requisição GraphQL autenticada contra a API Oficial da Shopee
   */
  private async executeGraphQL<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error(
        'Credenciais da API Shopee não configuradas no ambiente Vercel (SHOPEE_APP_ID / SHOPEE_APP_SECRET).'
      );
    }

    const payload = JSON.stringify({ query, variables });
    const { authHeader } = this.generateAuthHeader(payload);

    logSecurityEvent('info', 'ShopeeAPI', 'Executando requisição GraphQL para a Shopee Affiliate Open API', {
      endpoint: SHOPEE_GRAPHQL_ENDPOINT,
      hasVariables: Object.keys(variables).length > 0,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(SHOPEE_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'User-Agent': 'BuscaBusca-Shopee-MCP/1.0',
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logSecurityEvent('error', 'ShopeeAPI', `Erro HTTP da API Shopee: status ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(`Shopee API HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const json = await response.json();

      if (json.errors && json.errors.length > 0) {
        const firstErr = json.errors[0]?.message || 'Erro GraphQL não especificado';
        logSecurityEvent('error', 'ShopeeAPI', `Erro retornado pelo GraphQL Shopee: ${firstErr}`);
        throw new Error(`Shopee GraphQL Error: ${firstErr}`);
      }

      return json.data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        logSecurityEvent('error', 'ShopeeAPI', 'Timeout ao conectar com a API Shopee (10s excedido)');
        throw new Error('Timeout de comunicação com os servidores da Shopee.');
      }
      throw err;
    }
  }

  /**
   * Procedimento de diagnóstico seguro para testar conectividade e credenciais com a Shopee
   */
  public async testAuthentication(): Promise<ShopeeDiagnosticResult> {
    const start = Date.now();
    this.reloadCredentials();

    if (!this.isConfigured()) {
      return {
        configured: false,
        appIdConfigured: Boolean(this.appId),
        appSecretConfigured: Boolean(this.appSecret),
        endpointReachable: false,
        authenticated: false,
        message: 'Variáveis SHOPEE_APP_ID e/ou SHOPEE_APP_SECRET ausentes no servidor.',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Teste leve com query productOfferV2 limit 1
      const testQuery = `
        query TestAuth {
          productOfferV2(limit: 1) {
            pageInfo {
              limit
            }
          }
        }
      `;

      const payload = JSON.stringify({ query: testQuery, variables: {} });
      const { authHeader } = this.generateAuthHeader(payload);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(SHOPEE_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if (response.ok) {
        const data = await response.json();
        const hasGraphQLErrors = Boolean(data.errors && data.errors.length > 0);

        if (hasGraphQLErrors) {
          return {
            configured: true,
            appIdConfigured: true,
            appSecretConfigured: true,
            endpointReachable: true,
            statusCode: response.status,
            latencyMs,
            authenticated: false,
            message: `Endpoint respondeu, mas a API retornou erro de permissão/autenticação: ${data.errors[0]?.message || 'Desconhecido'}`,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          configured: true,
          appIdConfigured: true,
          appSecretConfigured: true,
          endpointReachable: true,
          statusCode: response.status,
          latencyMs,
          authenticated: true,
          message: 'Autenticação bem-sucedida! Credenciais aceitas pela API Shopee.',
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          configured: true,
          appIdConfigured: true,
          appSecretConfigured: true,
          endpointReachable: true,
          statusCode: response.status,
          latencyMs,
          authenticated: false,
          message: `Shopee respondeu com status HTTP ${response.status}. Verifique o AppId e Secret nas configurações.`,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        configured: true,
        appIdConfigured: true,
        appSecretConfigured: true,
        endpointReachable: false,
        latencyMs,
        authenticated: false,
        message: `Falha de rede ou timeout ao conectar à Shopee: ${err.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Converte uma URL de produto da Shopee em link curto de afiliado oficial
   * Operação: mutation generateShortLink($originUrl: String!, $subIds: [String])
   */
  public async generateShortLink(originUrl: string, subIds?: string[]): Promise<ShopeeShortLinkResponse> {
    const urlValidation = validateShopeeUrl(originUrl);
    if (!urlValidation.valid || !urlValidation.normalizedUrl) {
      return {
        success: false,
        originUrl,
        affiliateDisclaimer: AFFILIATE_DISCLAIMER,
        generatedAt: new Date().toISOString(),
        error: urlValidation.error || 'URL inválida.',
      };
    }

    const cleanUrl = urlValidation.normalizedUrl;

    if (!this.isConfigured()) {
      logSecurityEvent(
        'warn',
        'ShopeeLink',
        'Geração de link chamada sem credenciais reais no servidor. Retornando aviso de configuração.'
      );
      return {
        success: false,
        originUrl: cleanUrl,
        subIds,
        generatedAt: new Date().toISOString(),
        affiliateDisclaimer: AFFILIATE_DISCLAIMER,
        error:
          'Credenciais da API Shopee (SHOPEE_APP_ID / SHOPEE_APP_SECRET) não configuradas. Adicione as variáveis na Vercel para gerar links reais.',
      };
    }

    const mutation = `
      mutation GenerateAffiliateShortLink($originUrl: String!, $subIds: [String]) {
        generateShortLink(input: { originUrl: $originUrl, subIds: $subIds }) {
          shortLink
        }
      }
    `;

    try {
      const result = await this.executeGraphQL<{ generateShortLink: { shortLink: string } }>(mutation, {
        originUrl: cleanUrl,
        subIds: subIds && subIds.length > 0 ? subIds.slice(0, 5) : undefined,
      });

      const shortLink = result?.generateShortLink?.shortLink;

      if (!shortLink) {
        throw new Error('A API da Shopee não retornou o link encurtado.');
      }

      logSecurityEvent('info', 'ShopeeLink', 'Link de afiliado gerado com sucesso via API oficial');

      return {
        success: true,
        originUrl: cleanUrl,
        shortLink,
        subIds,
        generatedAt: new Date().toISOString(),
        affiliateDisclaimer: AFFILIATE_DISCLAIMER,
      };
    } catch (err: any) {
      logSecurityEvent('error', 'ShopeeLink', `Falha ao gerar link de afiliado: ${err.message}`);
      return {
        success: false,
        originUrl: cleanUrl,
        subIds,
        generatedAt: new Date().toISOString(),
        affiliateDisclaimer: AFFILIATE_DISCLAIMER,
        error: `Falha na API da Shopee: ${err.message}`,
      };
    }
  }

  /**
   * Pesquisa ofertas de produtos via query productOfferV2
   */
  public async searchOffers(params: {
    query?: string;
    category?: string;
    min_price?: number;
    max_price?: number;
    sort_by?: 'relevance' | 'sales' | 'price_asc' | 'price_desc' | 'rating';
    limit?: number;
    page?: number;
  }): Promise<ShopeeSearchResponse> {
    const limit = Math.min(Math.max(params.limit || 10, 1), 50);
    const page = Math.max(params.page || 1, 1);
    const keyword = params.query?.trim() || '';

    // Se estiver configurado, chama a API oficial Shopee GraphQL
    if (this.isConfigured()) {
      const graphQLQuery = `
        query SearchProductOfferV2($keyword: String, $page: Int, $limit: Int, $sortType: Int) {
          productOfferV2(keyword: $keyword, page: $page, limit: $limit, sortType: $sortType) {
            nodes {
              itemId
              productName
              price
              priceMin
              priceMax
              priceDiscountRate
              imageUrl
              productLink
              offerLink
              commissionRate
              sellerCommissionRate
              shopeeCommissionRate
              commission
              sales
              ratingStar
              shopId
              shopName
              shopType
            }
            pageInfo {
              page
              limit
              hasNextPage
            }
          }
        }
      `;

      // Mapeamento de ordenação da Shopee (sortType)
      let sortType = 0; // default relevance
      if (params.sort_by === 'sales') sortType = 1;
      else if (params.sort_by === 'price_asc') sortType = 2;
      else if (params.sort_by === 'price_desc') sortType = 3;
      else if (params.sort_by === 'rating') sortType = 4;

      try {
        const res = await this.executeGraphQL<{
          productOfferV2: {
            nodes: ShopeeProductOffer[];
            pageInfo: { page: number; limit: number; hasNextPage: boolean };
          };
        }>(graphQLQuery, {
          keyword: keyword || undefined,
          page,
          limit,
          sortType,
        });

        const nodes = res?.productOfferV2?.nodes || [];
        const pageInfo = res?.productOfferV2?.pageInfo || { page, limit, hasNextPage: false };

        // Aplica filtros de preço se especificados
        let filtered = nodes;
        if (params.min_price !== undefined) {
          filtered = filtered.filter(p => p.price >= (params.min_price || 0));
        }
        if (params.max_price !== undefined) {
          filtered = filtered.filter(p => p.price <= (params.max_price || Infinity));
        }

        return {
          products: filtered.map(p => ({ ...p, currency: 'BRL' })),
          total: filtered.length,
          page: pageInfo.page,
          limit: pageInfo.limit,
          hasNextPage: pageInfo.hasNextPage,
          source: 'shopee_official_api',
          queryTime: new Date().toISOString(),
          affiliateDisclaimer: AFFILIATE_DISCLAIMER,
        };
      } catch (err: any) {
        logSecurityEvent(
          'warn',
          'ShopeeSearch',
          `API Oficial falhou ou sem permissão para pesquisa geral (${err.message}). Utilizando catálogo seguro.`
        );
      }
    }

    // Catálogo de demonstração seguro (quando as credenciais não estiverem ativas ou a conta não tiver aprovação de query)
    let sampleResults = [...SAMPLE_VERIFIED_OFFERS];

    if (keyword) {
      const words = keyword.toLowerCase().split(/\s+/).filter(w => w.length > 1);
      if (words.length > 0) {
        sampleResults = sampleResults.filter(p => {
          const target = `${p.productName} ${p.shopName || ''}`.toLowerCase();
          return words.every(word => target.includes(word));
        });
      }
    }

    if (params.min_price !== undefined) {
      sampleResults = sampleResults.filter(p => p.price >= (params.min_price || 0));
    }
    if (params.max_price !== undefined) {
      sampleResults = sampleResults.filter(p => p.price <= (params.max_price || Infinity));
    }

    if (params.sort_by === 'price_asc') {
      sampleResults.sort((a, b) => a.price - b.price);
    } else if (params.sort_by === 'price_desc') {
      sampleResults.sort((a, b) => b.price - a.price);
    } else if (params.sort_by === 'sales') {
      sampleResults.sort((a, b) => (b.sales || 0) - (a.sales || 0));
    } else if (params.sort_by === 'rating') {
      sampleResults.sort((a, b) => (b.ratingStar || 0) - (a.ratingStar || 0));
    }

    const paginated = sampleResults.slice((page - 1) * limit, page * limit);

    return {
      products: paginated,
      total: sampleResults.length,
      page,
      limit,
      hasNextPage: page * limit < sampleResults.length,
      source: 'fallback_catalog',
      queryTime: new Date().toISOString(),
      affiliateDisclaimer: AFFILIATE_DISCLAIMER,
    };
  }

  /**
   * Obtém detalhes de um produto através do ID ou URL
   */
  public async getProductDetails(identifier: string): Promise<ShopeeProductOffer | null> {
    const isUrl = identifier.startsWith('http://') || identifier.startsWith('https://');

    if (isUrl) {
      const validation = validateShopeeUrl(identifier);
      if (!validation.valid) {
        throw new Error(validation.error || 'URL inválida.');
      }
    }

    // Busca no catálogo ou pesquisa por ID
    const searchRes = await this.searchOffers({ query: identifier, limit: 1 });
    if (searchRes.products.length > 0) {
      return searchRes.products[0];
    }

    // Procura no catálogo de exemplo
    const found = SAMPLE_VERIFIED_OFFERS.find(
      p => p.itemId === identifier || p.productLink.includes(identifier)
    );

    return found || null;
  }
}

// Instância singleton do cliente
export const shopeeClient = new ShopeeAffiliateClient();
