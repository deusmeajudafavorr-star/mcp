import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mcpServer, MCP_TOOLS } from '../server/mcp/server.ts';
import { logSecurityEvent } from '../server/shopee/security.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      name: 'busca-busca-shopee-mcp',
      version: '1.0.0',
      description: 'Servidor MCP Oficial Busca Busca — Shopee Offers & Affiliate API (Vercel Serverless)',
      protocolVersion: '2024-11-05',
      endpoint: '/mcp',
      capabilities: {
        tools: true,
        chatgptAppsSdk: true,
      },
      tools: MCP_TOOLS,
    });
  }

  if (req.method === 'POST') {
    try {
      const response = await mcpServer.handleJsonRpc(req.body);
      return res.status(200).json(response);
    } catch (err: any) {
      logSecurityEvent('error', 'VERCEL_MCP', `Erro na Vercel Function MCP: ${err.message}`);
      return res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id ?? null,
        error: { code: -32603, message: 'Internal Server Error' },
      });
    }
  }

  return res.status(405).json({ error: 'Método não permitido. Utilize POST ou GET.' });
}
