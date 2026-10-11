import React, { useState } from 'react';
import { Terminal, Copy, Check, ExternalLink, Code2, Play, BookOpen, Layers, Cpu } from 'lucide-react';

export const McpDocsTab: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mcpMethod, setMcpMethod] = useState<'initialize' | 'tools/list' | 'tools/call'>('tools/list');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestMcp = async () => {
    setTestLoading(true);
    setTestResponse(null);

    let payload: any = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: mcpMethod,
    };

    if (mcpMethod === 'initialize') {
      payload.params = {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'docs-tester', version: '1.0' },
      };
    } else if (mcpMethod === 'tools/call') {
      payload.params = {
        name: 'buscar_ofertas_shopee',
        arguments: { query: 'fone bluetooth', limit: 2 },
      };
    }

    try {
      const res = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setTestResponse(data);
    } catch (err: any) {
      setTestResponse({ error: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://seu-app.vercel.app';

  const chatgptConfig = JSON.stringify(
    {
      name: 'Busca Busca Shopee',
      mcp_server_url: `${currentHost}/mcp`,
      protocol_version: '2024-11-05',
      transport: 'http_post_jsonrpc',
      auth: 'none',
    },
    null,
    2
  );

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        'busca-busca-shopee': {
          url: `${currentHost}/mcp`,
        },
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-lg">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Integração MCP (Model Context Protocol) & Vercel
            </h2>
            <p className="text-xs text-zinc-400">
              Endpoint remoto compatível com ChatGPT Apps SDK, Claude Desktop e editores de IA.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
              Endpoint MCP Remoto (JSON-RPC 2.0)
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono text-zinc-200 truncate">{currentHost}/mcp</span>
              <button
                onClick={() => copyText(`${currentHost}/mcp`, 'mcp-url')}
                className="text-zinc-400 hover:text-zinc-200 transition-colors p-1"
              >
                {copiedKey === 'mcp-url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
              Versão do Protocolo MCP
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono text-zinc-200">2024-11-05 (Server Info: busca-busca-shopee-mcp)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Testador ao vivo do protocolo MCP */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-orange-500" />
            <h3 className="text-xs font-semibold text-zinc-200">Testador Interativo de Chamadas MCP</h3>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={mcpMethod}
              onChange={(e) => setMcpMethod(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
            >
              <option value="tools/list">tools/list (Descoberta)</option>
              <option value="initialize">initialize (Negociação)</option>
              <option value="tools/call">tools/call (buscar_ofertas_shopee)</option>
            </select>

            <button
              onClick={handleTestMcp}
              disabled={testLoading}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>{testLoading ? 'Executando...' : 'Enviar Chamada'}</span>
            </button>
          </div>
        </div>

        {testResponse && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5">
              <span>Resposta JSON-RPC 2.0 recebida do servidor:</span>
              <button
                onClick={() => copyText(JSON.stringify(testResponse, null, 2), 'test-json')}
                className="text-zinc-400 hover:text-zinc-200 text-[10px] flex items-center gap-1"
              >
                {copiedKey === 'test-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar JSON</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-emerald-400 bg-zinc-900/60 p-3 rounded max-h-56 overflow-y-auto">
              {JSON.stringify(testResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Snippets de Conexão */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* OpenAI / ChatGPT Apps SDK */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-zinc-200">Configuração para ChatGPT Apps SDK</h4>
            <button
              onClick={() => copyText(chatgptConfig, 'cfg-chatgpt')}
              className="text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1"
            >
              {copiedKey === 'cfg-chatgpt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copiar</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-zinc-300 bg-zinc-950 p-3 rounded border border-zinc-800 overflow-x-auto">
            {chatgptConfig}
          </pre>
          <p className="text-[11px] text-zinc-400">
            Conecte o ChatGPT diretamente no endpoint remoto <code>/mcp</code> configurado em sua URL da Vercel.
          </p>
        </div>

        {/* Claude Desktop / Editores */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-zinc-200">Claude Desktop (claude_desktop_config.json)</h4>
            <button
              onClick={() => copyText(claudeDesktopConfig, 'cfg-claude')}
              className="text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1"
            >
              {copiedKey === 'cfg-claude' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copiar</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-zinc-300 bg-zinc-950 p-3 rounded border border-zinc-800 overflow-x-auto">
            {claudeDesktopConfig}
          </pre>
          <p className="text-[11px] text-zinc-400">
            Compatível com clientes que suportam transporte HTTP / SSE do protocolo MCP.
          </p>
        </div>
      </div>

      {/* Guia de Implantação e Limitações Conhecidas */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4 text-xs text-zinc-300">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-orange-500" /> Guia de Instalação & Informações da API Shopee
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-200">1. Execução Local no Windows:</h4>
            <div className="bg-zinc-950 p-3 rounded font-mono text-[11px] text-zinc-400 space-y-1">
              <p># Instale as dependências</p>
              <p className="text-zinc-200">npm install</p>
              <p># Execute os testes automatizados</p>
              <p className="text-zinc-200">npm run test</p>
              <p># Inicie o servidor de desenvolvimento</p>
              <p className="text-zinc-200">npm run dev</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-200">2. Variáveis de Ambiente na Vercel:</h4>
            <p className="text-zinc-400 leading-relaxed">
              No painel da Vercel (<strong>Project → Settings → Environment Variables</strong>), adicione:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
              <li><code>SHOPEE_APP_ID</code>: seu App ID do portal de afiliados Shopee.</li>
              <li><code>SHOPEE_APP_SECRET</code>: chave secreta da aplicação Shopee.</li>
              <li><code>ADMIN_SECRET_KEY</code>: senha para o painel de diagnósticos.</li>
            </ul>
            <p className="text-amber-400 text-[11px]">
              * Lembre-se de disparar um novo deploy na Vercel após alterar variáveis.
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-800/80 pt-4 space-y-2">
          <h4 className="font-semibold text-zinc-200">Limitações e Permissões da API Shopee:</h4>
          <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
            <li>A API Oficial de Afiliados da Shopee funciona exclusivamente via <strong>GraphQL sobre HTTPS</strong> (<code>https://open-api.affiliate.shopee.com.br/graphql</code>).</li>
            <li>A autenticação exige assinatura <strong>HMAC-SHA256</strong> com timestamp recente em segundos.</li>
            <li>A aprovação no programa de afiliados da Shopee é obrigatória para que as chamadas sejam autorizadas.</li>
            <li>O limite para <code>subIds</code> na mutação <code>generateShortLink</code> é de até 5 tags personalizadas.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
