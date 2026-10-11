import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { shopeeClient } from '../shopee/client.ts';
import { getSanitizedLogs, logSecurityEvent, validateShopeeUrl } from '../shopee/security.ts';

export const adminRouter = Router();

const SERVER_START_TIME = Date.now();

/**
 * Middleware para autenticação segura do painel administrativo
 * Valida a chave através do header 'x-admin-key' ou 'Authorization: Bearer ...'
 */
function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const adminSecret = process.env.ADMIN_SECRET_KEY?.trim();

  // Se a chave não estiver configurada no servidor, recusa com instrução clara
  if (!adminSecret) {
    res.status(503).json({
      error: 'ADMIN_SECRET_KEY_NOT_CONFIGURED',
      message: 'A variável ADMIN_SECRET_KEY não está definida nas variáveis de ambiente da Vercel. Configure-a para habilitar a área administrativa.',
    });
    return;
  }

  const headerKey = req.headers['x-admin-key'] as string;
  const authHeader = req.headers['authorization'];
  let providedKey = headerKey;

  if (!providedKey && authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7).trim();
  }

  if (!providedKey) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Acesso negado. Forneça a chave administrativa no header x-admin-key ou Authorization: Bearer.',
    });
    return;
  }

  // Comparação em tempo constante para mitigar timing attacks
  const expectedHash = crypto.createHash('sha256').update(adminSecret).digest();
  const providedHash = crypto.createHash('sha256').update(providedKey).digest();

  if (crypto.timingSafeEqual(expectedHash, providedHash)) {
    next();
  } else {
    logSecurityEvent('warn', 'ADMIN_AUTH', 'Tentativa de login administrativo com chave inválida', {
      ip: req.ip,
    });
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Chave administrativa incorreta.',
    });
  }
}

// Todas as rotas abaixo requerem autenticação
adminRouter.use(requireAdminAuth);

/**
 * GET /api/admin/status
 * Retorna o estado do servidor e das variáveis sem expor credenciais
 */
adminRouter.get('/status', (req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  const shopeeStatus = shopeeClient.getConfigurationStatus();

  res.json({
    server: {
      status: 'online',
      uptimeSeconds,
      uptimeFormatted: `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s`,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
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
});

/**
 * POST /api/admin/test-auth
 * Executa teste real de autenticação contra a API Oficial da Shopee
 */
adminRouter.post('/test-auth', async (req: Request, res: Response) => {
  try {
    const diagnostic = await shopeeClient.testAuthentication();
    res.json(diagnostic);
  } catch (err: any) {
    res.status(500).json({
      configured: true,
      authenticated: false,
      endpointReachable: false,
      message: `Erro interno no teste: ${err.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/admin/test-link
 * Testa geração de link de afiliado com URL fornecida ou URL padrão
 */
adminRouter.post('/test-link', async (req: Request, res: Response) => {
  const testUrl = req.body.url || 'https://shopee.com.br/product/18392104921/123456';
  const subIds = req.body.subIds || ['test-admin'];

  const validation = validateShopeeUrl(testUrl);
  if (!validation.valid || !validation.normalizedUrl) {
    res.status(400).json({
      success: false,
      error: validation.error,
    });
    return;
  }

  const result = await shopeeClient.generateShortLink(validation.normalizedUrl, subIds);
  res.json(result);
});

/**
 * GET /api/admin/logs
 * Retorna os últimos logs sanitizados de eventos de segurança e requisições
 */
adminRouter.get('/logs', (req: Request, res: Response) => {
  const logs = getSanitizedLogs();
  res.json({ logs });
});
