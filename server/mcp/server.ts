import {
  JsonRpcRequest,
  JsonRpcResponse,
  McpTool,
  McpInitializeResult,
  McpCallResult,
} from './types.ts';
import { shopeeClient } from '../shopee/client.ts';
import { validateShopeeUrl, logSecurityEvent } from '../shopee/security.ts';
import { buildChatGPTProductWidget, CHATGPT_APP_METADATA } from '../chatgpt/appsSdk.ts';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_NAME = 'busca-busca-shopee-mcp';
const SERVER_VERSION = '1.0.0';
const AFFILIATE_DISCLAIMER =
  'Este é um link de afiliado. Podemos receber comissão por compras elegíveis, sem custo adicional para você.';

// Lista oficial de ferramentas MCP disponíveis para o cliente / ChatGPT
export const MCP_TOOLS: McpTool[] = [
  {
    name: 'buscar_ofertas_shopee',
    description:
      'Pesquisa produtos e ofertas na Shopee com preços em BRL, descontos, imagens oficiais e links de afiliado rastreáveis.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Termo de busca do produto (ex: "fone sem fio bluetooth", "teclado gamer", "mochila notebook").',
        },
        category: {
          type: 'string',
          description: 'Categoria opcional do produto para refinamento da busca.',
        },
        min_price: {
          type: 'number',
          description: 'Preço mínimo do produto em Reais (BRL).',
        },
        max_price: {
          type: 'number',
          description: 'Preço máximo do produto em Reais (BRL).',
        },
        sort_by: {
          type: 'string',
          enum: ['relevance', 'sales', 'price_asc', 'price_desc', 'rating'],
          description: 'Critério de ordenação dos resultados (relevance, sales, price_asc, price_desc, rating).',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Quantidade máxima de ofertas a retornar (padrão: 10, máximo: 50).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'detalhes_produto_shopee',
    description:
      'Consulta os detalhes confirmados de um produto da Shopee (especificações, preços, loja, avaliação) através do seu itemId ou URL oficial.',
    inputSchema: {
      type: 'object',
      properties: {
        item_id: {
          type: 'string',
          description: 'ID numérico do produto na Shopee (ex: "18392104921").',
        },
        product_url: {
          type: 'string',
          description: 'URL completa do produto na Shopee (ex: "https://shopee.com.br/produto-i.12345.67890").',
        },
      },
    },
  },
  {
    name: 'converter_link_afiliado',
    description:
      'Converte uma URL legítima de produto ou loja da Shopee em um link curto oficial de afiliado para monetização e rastreamento de comissões.',
    inputSchema: {
      type: 'object',
      properties: {
        product_url: {
          type: 'string',
          description: 'URL oficial do produto ou loja na Shopee que você deseja converter.',
        },
        sub_ids: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 5,
          description: 'Até 5 identificadores opcionais para rastreamento de campanha (sub-ID utm_content).',
        },
      },
      required: ['product_url'],
    },
  },
];

export class McpServer {
  /**
   * Trata requisições JSON-RPC 2.0 do protocolo MCP
   */
  public async handleJsonRpc(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = request.id ?? null;

    if (!request || request.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32600, message: 'Invalid Request: jsonrpc deve ser "2.0"' },
      };
    }

    try {
      switch (request.method) {
        case 'initialize': {
          const result: McpInitializeResult = {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
              tools: { listChanged: false },
              logging: {},
            },
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION,
              description: 'Servidor MCP Busca Busca — Shopee Offers & Affiliate API',
            },
          };
          return { jsonrpc: '2.0', id, result };
        }

        case 'notifications/initialized': {
          return { jsonrpc: '2.0', id, result: {} };
        }

        case 'ping': {
          return { jsonrpc: '2.0', id, result: {} };
        }

        case 'tools/list': {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: MCP_TOOLS,
            },
          };
        }

        case 'tools/call': {
          const params = request.params || {};
          const toolName = params.name;
          const args = params.arguments || {};

          if (!toolName) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: 'Invalid params: nome da ferramenta ("name") ausente' },
            };
          }

          const callResult = await this.executeTool(toolName, args);
          return {
            jsonrpc: '2.0',
            id,
            result: callResult,
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method not found: "${request.method}"` },
          };
      }
    } catch (err: any) {
      logSecurityEvent('error', 'MCP', `Erro inesperado no método MCP ${request.method}: ${err.message}`);
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error no processamento MCP.',
          data: { details: err.message },
        },
      };
    }
  }

  /**
   * Executa a ferramenta MCP solicitada
   */
  public async executeTool(name: string, args: Record<string, any>): Promise<McpCallResult> {
    logSecurityEvent('info', 'MCP_TOOL_EXEC', `Chamando ferramenta: ${name}`, { argsKeys: Object.keys(args) });

    switch (name) {
      case 'buscar_ofertas_shopee': {
        const query = args.query;
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Erro: O parâmetro "query" é obrigatório para pesquisar ofertas na Shopee.',
              },
            ],
          };
        }

        const searchRes = await shopeeClient.searchOffers({
          query: query.trim(),
          category: args.category,
          min_price: typeof args.min_price === 'number' ? args.min_price : undefined,
          max_price: typeof args.max_price === 'number' ? args.max_price : undefined,
          sort_by: args.sort_by,
          limit: typeof args.limit === 'number' ? args.limit : 10,
        });

        const formattedText = this.formatOffersAsText(query, searchRes);
        const widgetPayload = buildChatGPTProductWidget(searchRes.products, query, AFFILIATE_DISCLAIMER);

        return {
          content: [
            {
              type: 'text',
              text: formattedText,
            },
          ],
          _meta: {
            app: CHATGPT_APP_METADATA,
            total_found: searchRes.total,
            source: searchRes.source,
            timestamp: searchRes.queryTime,
            chatgpt_widget: widgetPayload,
          },
        };
      }

      case 'detalhes_produto_shopee': {
        const itemId = args.item_id;
        const productUrl = args.product_url;

        if (!itemId && !productUrl) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Erro: Forneça pelo menos "item_id" ou "product_url" para consultar os detalhes do produto.',
              },
            ],
          };
        }

        const identifier = itemId || productUrl;
        const product = await shopeeClient.getProductDetails(identifier);

        if (!product) {
          return {
            isError: false,
            content: [
              {
                type: 'text',
                text: `Produto não encontrado para o identificador "${identifier}". Verifique se o ID ou URL estão corretos.`,
              },
            ],
          };
        }

        const textOutput = [
          `📦 DETALHES DO PRODUTO SHOPEE`,
          `----------------------------------------`,
          `Título: ${product.productName}`,
          `ID do Item: ${product.itemId}`,
          `Preço Atual: R$ ${product.price.toFixed(2).replace('.', ',')}`,
          product.priceMax ? `Preço Anterior: R$ ${product.priceMax.toFixed(2).replace('.', ',')}` : null,
          product.priceDiscountRate ? `Desconto: ${product.priceDiscountRate}% OFF` : null,
          `Loja: ${product.shopName || 'Loja Shopee'}`,
          product.ratingStar ? `Avaliação: ${product.ratingStar.toFixed(1)} / 5.0 estrelas` : null,
          product.sales ? `Vendas confirmadas: ${product.sales.toLocaleString('pt-BR')}` : null,
          `Link da Oferta: ${product.offerLink || product.productLink}`,
          `----------------------------------------`,
          `⚠️ AVISO LEGAL: ${AFFILIATE_DISCLAIMER}`,
        ]
          .filter(Boolean)
          .join('\n');

        return {
          content: [{ type: 'text', text: textOutput }],
          _meta: {
            product,
            disclaimer: AFFILIATE_DISCLAIMER,
          },
        };
      }

      case 'converter_link_afiliado': {
        const productUrl = args.product_url;
        if (!productUrl || typeof productUrl !== 'string') {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Erro: O parâmetro "product_url" é obrigatório para conversão de link.',
              },
            ],
          };
        }

        const validation = validateShopeeUrl(productUrl);
        if (!validation.valid || !validation.normalizedUrl) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `URL inválida ou não autorizada: ${validation.error || 'Formato incorreto'}`,
              },
            ],
          };
        }

        const subIds = Array.isArray(args.sub_ids) ? args.sub_ids.filter(s => typeof s === 'string') : undefined;
        const linkRes = await shopeeClient.generateShortLink(validation.normalizedUrl, subIds);

        if (!linkRes.success) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Não foi possível gerar o link de afiliado: ${linkRes.error}`,
              },
            ],
          };
        }

        const textOutput = [
          `🔗 LINK DE AFILIADO SHOPEE GERADO COM SUCESSO`,
          `----------------------------------------`,
          `URL Original: ${linkRes.originUrl}`,
          `Link de Afiliado: ${linkRes.shortLink}`,
          linkRes.subIds && linkRes.subIds.length > 0 ? `Tags de Rastreamento (sub_ids): ${linkRes.subIds.join(', ')}` : null,
          `Gerado em: ${linkRes.generatedAt}`,
          `----------------------------------------`,
          `⚠️ AVISO LEGAL: ${AFFILIATE_DISCLAIMER}`,
        ]
          .filter(Boolean)
          .join('\n');

        return {
          content: [{ type: 'text', text: textOutput }],
          _meta: {
            success: true,
            shortLink: linkRes.shortLink,
            originUrl: linkRes.originUrl,
            disclaimer: AFFILIATE_DISCLAIMER,
          },
        };
      }

      default:
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Ferramenta desconhecida: "${name}". Consulte tools/list para obter a lista de ferramentas disponíveis.`,
            },
          ],
        };
    }
  }

  /**
   * Converte a lista de ofertas em texto legível para o chat
   */
  private formatOffersAsText(query: string, res: any): string {
    const products = res.products || [];

    if (products.length === 0) {
      return `Nenhuma oferta encontrada na Shopee para a busca: "${query}". Tente outros termos de pesquisa.`;
    }

    const lines: string[] = [
      `🛍️ ENCONTRADAS ${products.length} OFERTAS NA SHOPEE PARA "${query.toUpperCase()}":`,
      `Fonte: ${res.source === 'shopee_official_api' ? 'API Oficial Shopee Afiliados' : 'Catálogo Verificado'} | Horário: ${new Date(res.queryTime).toLocaleTimeString('pt-BR')}`,
      `----------------------------------------`,
    ];

    products.forEach((p: any, index: number) => {
      lines.push(`${index + 1}. ${p.productName}`);
      lines.push(`   💰 Preço: R$ ${p.price.toFixed(2).replace('.', ',')}${p.priceDiscountRate ? ` (${p.priceDiscountRate}% OFF)` : ''}`);
      if (p.ratingStar) lines.push(`   ⭐ Avaliação: ${p.ratingStar.toFixed(1)} / 5.0`);
      if (p.sales) lines.push(`   📦 Vendas: ${p.sales.toLocaleString('pt-BR')} unidades`);
      if (p.shopName) lines.push(`   🏬 Loja: ${p.shopName}`);
      lines.push(`   🔗 Ver Oferta: ${p.offerLink || p.productLink}`);
      lines.push('');
    });

    lines.push(`----------------------------------------`);
    lines.push(`⚠️ AVISO OBRIGATÓRIO: ${AFFILIATE_DISCLAIMER}`);

    return lines.join('\n');
  }
}

export const mcpServer = new McpServer();
