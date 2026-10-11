import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { mcpServer, MCP_TOOLS } from './server/mcp/server.ts';
import { adminRouter } from './server/admin/routes.ts';
import { shopeeClient } from './server/shopee/client.ts';
import { validateShopeeUrl, logSecurityEvent } from './server/shopee/security.ts';
import { CHATGPT_APP_METADATA } from './server/chatgpt/appsSdk.ts';

// Carrega variáveis locais de .env se presente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Habilita CORS para permitir conexões do ChatGPT, MCP clients e frontend
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '1mb' }));

// Middleware simples de Rate Limiting em memória (100 requisições por minuto por IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;

  const current = rateLimitMap.get(ip);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    next();
  } else if (current.count < 120) {
    current.count += 1;
    next();
  } else {
    logSecurityEvent('warn', 'RATE_LIMIT', `Limite de requisições excedido para o IP ${ip}`);
    res.status(429).json({
      error: 'TOO_MANY_REQUESTS',
      message: 'Muitas requisições. Aguarde um minuto antes de tentar novamente.',
    });
  }
}

app.use('/api/', rateLimiter);
app.use('/mcp', rateLimiter);

// ==========================================
// ENDPOINTS DO MODEL CONTEXT PROTOCOL (MCP)
// ==========================================

/**
 * POST /mcp
 * Endpoint principal do protocolo MCP (JSON-RPC 2.0).
 * Compatível com ChatGPT Apps SDK, Claude Desktop, Cursor e outros clientes MCP.
 */
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    const jsonRpcResponse = await mcpServer.handleJsonRpc(req.body);
    res.json(jsonRpcResponse);
  } catch (err: any) {
    logSecurityEvent('error', 'MCP_ENDPOINT', `Erro ao processar requisição MCP: ${err.message}`);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id ?? null,
      error: { code: -32603, message: 'Internal server error no endpoint MCP' },
    });
  }
});

/**
 * GET /mcp
 * Retorna metadados do servidor MCP e lista de ferramentas disponíveis
 */
app.get('/mcp', (req: Request, res: Response) => {
  res.json({
    name: 'busca-busca-shopee-mcp',
    version: '1.0.0',
    description: 'Servidor MCP Oficial Busca Busca — Shopee Offers & Affiliate API',
    protocolVersion: '2024-11-05',
    transport: 'HTTP POST JSON-RPC 2.0 & SSE',
    endpoint: '/mcp',
    sseEndpoint: '/mcp/sse',
    capabilities: {
      tools: true,
      chatgptAppsSdk: true,
    },
    tools: MCP_TOOLS,
  });
});

/**
 * GET /mcp/sse
 * Suporte a transporte Server-Sent Events (SSE) para clientes MCP com streaming contínuo
 */
app.get('/mcp/sse', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Envia evento de inicialização de conexão SSE
  const initMsg = JSON.stringify({
    jsonrpc: '2.0',
    method: 'mcp/connected',
    params: {
      server: 'busca-busca-shopee-mcp',
      version: '1.0.0',
      protocolVersion: '2024-11-05',
    },
  });

  res.write(`data: ${initMsg}\n\n`);

  // Mantém ping ativo a cada 25 segundos
  const intervalId = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

// ==========================================
// ROTAS PÚBLICAS DA API
// ==========================================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    shopeeConfigured: shopeeClient.isConfigured(),
  });
});

// Metadados do OpenAI Apps SDK
app.get('/api/chatgpt-app-manifest', (req: Request, res: Response) => {
  res.json(CHATGPT_APP_METADATA);
});

// Lista de ferramentas MCP para consumo do frontend e documentação
app.get('/api/tools', (req: Request, res: Response) => {
  res.json({ tools: MCP_TOOLS });
});

// Pesquisa de ofertas (proxy público para o frontend)
app.post('/api/search', async (req: Request, res: Response) => {
  try {
    const { query, category, min_price, max_price, sort_by, limit, page } = req.body;
    const results = await shopeeClient.searchOffers({
      query,
      category,
      min_price: typeof min_price === 'number' ? min_price : undefined,
      max_price: typeof max_price === 'number' ? max_price : undefined,
      sort_by,
      limit: typeof limit === 'number' ? limit : 12,
      page: typeof page === 'number' ? page : 1,
    });
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Conversão de links de afiliado com proteção SSRF
app.post('/api/convert-link', async (req: Request, res: Response) => {
  try {
    const { url, subIds } = req.body;
    if (!url) {
      res.status(400).json({ error: 'URL do produto é obrigatória.' });
      return;
    }

    const validation = validateShopeeUrl(url);
    if (!validation.valid || !validation.normalizedUrl) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const result = await shopeeClient.generateShortLink(validation.normalizedUrl, subIds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rotas administrativas protegidas
app.use('/api/admin', adminRouter);

// ==========================================
// VITE DEV SERVER OU ARQUIVOS ESTÁTICOS
// ==========================================
async function startServer() {
  if (!isProduction) {
    // Modo de desenvolvimento: integra middlewares do Vite no Express
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Modo de produção: serve arquivos compilados da pasta dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BuscaBusca] Servidor rodando na porta ${PORT}`);
    console.log(`[BuscaBusca] Endpoint MCP disponível em http://localhost:${PORT}/mcp`);
    console.log(`[BuscaBusca] Status Shopee: ${shopeeClient.isConfigured() ? 'CONFIGURADO' : 'NÃO CONFIGURADO (Adicione SHOPEE_APP_ID e SHOPEE_APP_SECRET)'}`);
  });
}

startServer().catch(err => {
  console.error('[BuscaBusca] Erro fatal ao iniciar o servidor:', err);
  process.exit(1);
});
