import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { shopeeClient } from '../server/shopee/client.ts';
import { validateShopeeUrl, getSanitizedLogs } from '../server/shopee/security.ts';
import { MCP_TOOLS } from '../server/mcp/server.ts';
import { CHATGPT_APP_METADATA } from '../server/chatgpt/appsSdk.ts';

function checkAdminAuth(req: VercelRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET_KEY?.trim();
  if (!adminSecret) return false;

  const headerKey = req.headers['x-admin-key'] as string;
  const authHeader = req.headers['authorization'];
  let providedKey = headerKey;
  if (!providedKey && authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7).trim();
  }
  if (!providedKey) return false;

  const expectedHash = crypto.createHash('sha256').update(adminSecret).digest();
  const providedHash = crypto.createHash('sha256').update(providedKey).digest();
  return crypto.timingSafeEqual(expectedHash, providedHash);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extrai rota relativa
  const url = req.url || '';
  const pathname = url.split('?')[0].replace(/^\/api/, '');

  try {
    if (pathname === '/health' || pathname === '') {
      return res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        platform: 'Vercel Serverless Functions',
        shopeeConfigured: shopeeClient.isConfigured(),
      });
    }

    if (pathname === '/tools') {
      return res.status(200).json({ tools: MCP_TOOLS });
    }

    if (pathname === '/chatgpt-app-manifest') {
      return res.status(200).json(CHATGPT_APP_METADATA);
    }

    if (pathname === '/search' && req.method === 'POST') {
      const { query, category, min_price, max_price, sort_by, limit, page } = req.body || {};
      const results = await shopeeClient.searchOffers({
        query,
        category,
        min_price,
        max_price,
        sort_by,
        limit,
        page,
      });
      return res.status(200).json(results);
    }

    if (pathname === '/convert-link' && req.method === 'POST') {
      const { url: rawUrl, subIds } = req.body || {};
      if (!rawUrl) return res.status(400).json({ error: 'URL do produto é obrigatória.' });

      const validation = validateShopeeUrl(rawUrl);
      if (!validation.valid || !validation.normalizedUrl) {
        return res.status(400).json({ error: validation.error });
      }

      const result = await shopeeClient.generateShortLink(validation.normalizedUrl, subIds);
      return res.status(200).json(result);
    }

    // Rotas administrativas
    if (pathname.startsWith('/admin')) {
      if (!checkAdminAuth(req)) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Acesso negado. Forneça a chave administrativa em x-admin-key.',
        });
      }

      if (pathname === '/admin/status') {
        const shopeeStatus = shopeeClient.getConfigurationStatus();
        return res.status(200).json({
          server: {
            status: 'online',
            environment: 'vercel_serverless',
            nodeVersion: process.version,
          },
          credentials: {
            SHOPEE_APP_ID_CONFIGURED: shopeeStatus.appIdConfigured,
            SHOPEE_APP_SECRET_CONFIGURED: shopeeStatus.appSecretConfigured,
            ADMIN_SECRET_KEY_CONFIGURED: Boolean(process.env.ADMIN_SECRET_KEY),
            appIdMasked: shopeeStatus.appIdMasked,
            endpoint: shopeeStatus.endpoint,
          },
          capabilities: {
            generateShortLink: true,
            productOfferV2: true,
            mcpProtocolV20241105: true,
            chatgptAppsSdkReady: true,
          },
        });
      }

      if (pathname === '/admin/test-auth' && req.method === 'POST') {
        const diagnostic = await shopeeClient.testAuthentication();
        return res.status(200).json(diagnostic);
      }

      if (pathname === '/admin/test-link' && req.method === 'POST') {
        const testUrl = req.body?.url || 'https://shopee.com.br/product/18392104921/123456';
        const subIds = req.body?.subIds || ['vercel-test'];
        const validation = validateShopeeUrl(testUrl);
        if (!validation.valid || !validation.normalizedUrl) {
          return res.status(400).json({ error: validation.error });
        }
        const result = await shopeeClient.generateShortLink(validation.normalizedUrl, subIds);
        return res.status(200).json(result);
      }

      if (pathname === '/admin/logs') {
        return res.status(200).json({ logs: getSanitizedLogs() });
      }
    }

    return res.status(404).json({ error: 'Endpoint não encontrado', path: pathname });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
