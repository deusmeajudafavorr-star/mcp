import React, { useState } from 'react';
import { Send, Bot, User, Code2, Sparkles, ExternalLink, RefreshCw, ShoppingCart } from 'lucide-react';

interface SimulatedMessage {
  id: string;
  sender: 'user' | 'chatgpt';
  text: string;
  toolCall?: {
    name: string;
    arguments: Record<string, any>;
  };
  mcpResponse?: any;
  widget?: any;
}

const PRESET_PROMPTS = [
  'Encontre fones bluetooth com cancelamento de ruído na Shopee por menos de 60 reais',
  'Quais os mouses gamer mais vendidos na Shopee?',
  'Procure suportes articulados para notebook com boas avaliações',
  'Converta o link https://shopee.com.br/product/18392104921/123 para afiliado com a tag instagram',
];

export const ChatGptSimulatorTab: React.FC = () => {
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0]);
  const [loading, setLoading] = useState(false);
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [messages, setMessages] = useState<SimulatedMessage[]>([
    {
      id: 'welcome',
      sender: 'chatgpt',
      text: 'Olá! Sou o assistente integrado ao Busca Busca. Como posso te ajudar a encontrar as melhores ofertas e produtos na Shopee hoje?',
    },
  ]);

  const handleSimulate = async (userPrompt = prompt) => {
    if (!userPrompt.trim()) return;

    const userMsgId = `user_${Date.now()}`;
    const userMsg: SimulatedMessage = {
      id: userMsgId,
      sender: 'user',
      text: userPrompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Determina qual ferramenta MCP chamar com base no prompt
      let toolName = 'buscar_ofertas_shopee';
      let toolArgs: Record<string, any> = { query: 'fone bluetooth', limit: 3 };

      if (userPrompt.toLowerCase().includes('converte') || userPrompt.toLowerCase().includes('link')) {
        toolName = 'converter_link_afiliado';
        const urlMatch = userPrompt.match(/https?:\/\/[^\s]+/);
        toolArgs = {
          product_url: urlMatch ? urlMatch[0] : 'https://shopee.com.br/product/18392104921/123',
          sub_ids: ['chatgpt-app'],
        };
      } else {
        // Extrai termos e filtros básicos
        let cleanQuery = userPrompt
          .replace(/encontre|procure|quais os|na shopee|por menos de \d+|com desconto/gi, '')
          .trim();
        if (!cleanQuery) cleanQuery = 'fone bluetooth';

        let maxPrice: number | undefined;
        const priceMatch = userPrompt.match(/menos de\s+(\d+)/i);
        if (priceMatch && priceMatch[1]) {
          maxPrice = parseFloat(priceMatch[1]);
        }

        let sortBy: string | undefined;
        if (userPrompt.toLowerCase().includes('mais vendido')) sortBy = 'sales';
        if (userPrompt.toLowerCase().includes('avaliaç')) sortBy = 'rating';

        toolArgs = {
          query: cleanQuery,
          max_price: maxPrice,
          sort_by: sortBy || 'relevance',
          limit: 3,
        };
      }

      // Executa chamada real no endpoint /mcp via JSON-RPC 2.0
      const mcpPayload = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: toolArgs,
        },
      };

      const mcpRes = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcpPayload),
      });

      const mcpData = await mcpRes.json();
      const rawText = mcpData.result?.content?.[0]?.text || 'Resultados processados.';
      const widget = mcpData.result?._meta?.chatgpt_widget;

      const botMsg: SimulatedMessage = {
        id: `bot_${Date.now()}`,
        sender: 'chatgpt',
        text: rawText,
        toolCall: {
          name: toolName,
          arguments: toolArgs,
        },
        mcpResponse: mcpData,
        widget,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: SimulatedMessage = {
        id: `bot_err_${Date.now()}`,
        sender: 'chatgpt',
        text: `Ocorreu um erro ao comunicar com o servidor MCP: ${err.message}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Simulador */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" /> Simulador de Interação: ChatGPT + Busca Busca MCP
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Veja exatamente como o ChatGPT aciona o backend remoto via JSON-RPC 2.0 e renderiza os cartões visuais do Apps SDK.
          </p>
        </div>

        <button
          onClick={() => setShowJsonInspector(!showJsonInspector)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            showJsonInspector
              ? 'bg-orange-600 text-white'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>{showJsonInspector ? 'Ocultar JSON-RPC' : 'Inspecionar Protocolo MCP'}</span>
        </button>
      </div>

      {/* Caixa do Chat do ChatGPT */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col min-h-[500px]">
        {/* Barra superior de status do chat */}
        <div className="bg-zinc-950/80 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-zinc-200">ChatGPT Apps SDK Client</span>
            <span aria-hidden="true">·</span>
            <span className="text-zinc-500">MCP Protocol v2024-11-05</span>
          </div>
          <button
            onClick={() => setMessages([messages[0]])}
            className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Limpar conversa
          </button>
        </div>

        {/* Mensagens */}
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              <div
                className={`flex gap-3 max-w-3xl ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.sender === 'user'
                      ? 'bg-zinc-700 text-zinc-200'
                      : 'bg-orange-600 text-white'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Conteúdo da mensagem */}
                <div className={`space-y-3 flex-1 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                  <div
                    className={`inline-block p-3.5 rounded-xl text-xs leading-relaxed text-left ${
                      msg.sender === 'user'
                        ? 'bg-zinc-800 text-zinc-100 rounded-tr-none'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-tl-none whitespace-pre-line'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Detalhes do Tool Call do MCP */}
                  {msg.toolCall && (
                    <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3 text-left">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-orange-400 mb-1.5">
                        <Code2 className="w-3.5 h-3.5" />
                        <span>MCP Tool Call: {msg.toolCall.name}</span>
                      </div>
                      <pre className="text-[11px] font-mono text-zinc-400 bg-zinc-900/60 p-2 rounded overflow-x-auto">
                        {JSON.stringify(msg.toolCall.arguments, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Renderização do Widget Visual do ChatGPT Apps SDK */}
                  {msg.widget && msg.widget.items && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-left space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                        <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                          <ShoppingCart className="w-3.5 h-3.5 text-orange-400" />
                          {msg.widget.title}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">Apps SDK Widget</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                        {msg.widget.items.map((item: any) => (
                          <div
                            key={item.id}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col justify-between"
                          >
                            <div className="aspect-video bg-zinc-950 overflow-hidden relative">
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                              {item.price.discount_percentage && (
                                <span className="absolute top-1.5 left-1.5 bg-orange-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded">
                                  {item.price.discount_percentage}
                                </span>
                              )}
                            </div>

                            <div className="p-3 space-y-2">
                              <h5 className="text-[11px] font-medium text-zinc-200 line-clamp-2">
                                {item.title}
                              </h5>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-sm font-bold text-zinc-100">
                                  {item.price.formatted}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <span>{item.metrics.rating || '★ 4.8'}</span>
                                <span aria-hidden="true">·</span>
                                <span>{item.seller.name}</span>
                              </div>
                            </div>

                            <div className="p-2.5 pt-0">
                              <a
                                href={item.actions?.[0]?.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-1.5 px-2 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-semibold rounded flex items-center justify-center gap-1 transition-colors"
                              >
                                <span>Ver na Shopee</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-[10px] text-zinc-500 pt-1">
                        {msg.widget.disclaimer}
                      </p>
                    </div>
                  )}

                  {/* Painel Inspecionar JSON-RPC se ativado */}
                  {showJsonInspector && msg.mcpResponse && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-left">
                      <span className="text-[11px] font-mono text-zinc-400 block mb-1">
                        JSON-RPC 2.0 Response Payload:
                      </span>
                      <pre className="text-[10px] font-mono text-emerald-400/90 bg-zinc-900/80 p-2.5 rounded overflow-x-auto max-h-48 overflow-y-auto">
                        {JSON.stringify(msg.mcpResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 text-xs text-zinc-400 items-center">
              <div className="w-7 h-7 rounded-full bg-orange-600/30 flex items-center justify-center text-orange-400">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <span className="text-zinc-400">ChatGPT consultando ferramenta MCP Busca Busca...</span>
            </div>
          )}
        </div>

        {/* Input do chat com presets */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1">
            <span className="text-zinc-500 whitespace-nowrap">Exemplos:</span>
            {PRESET_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(p);
                  handleSimulate(p);
                }}
                className="text-zinc-400 hover:text-orange-400 hover:bg-zinc-900 px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer"
              >
                {p.slice(0, 36)}...
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSimulate();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Pergunte ao ChatGPT sobre qualquer produto da Shopee..."
              className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
