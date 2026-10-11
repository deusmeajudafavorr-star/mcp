import React, { useState } from 'react';
import { Link2, Copy, Check, ExternalLink, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export const LinkConverterTab: React.FC = () => {
  const [url, setUrl] = useState('');
  const [subId1, setSubId1] = useState('');
  const [subId2, setSubId2] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    originUrl?: string;
    shortLink?: string;
    subIds?: string[];
    generatedAt?: string;
    affiliateDisclaimer?: string;
    error?: string;
  } | null>(null);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);
    setCopied(false);

    try {
      const subIds = [subId1.trim(), subId2.trim()].filter(Boolean);
      const res = await fetch('/api/convert-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), subIds }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || 'Falha na conexão com o servidor.',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-lg">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Gerador Oficial de Links de Afiliado</h2>
            <p className="text-xs text-zinc-400">
              Transforme qualquer link de produto ou loja da Shopee em link curto rastreável com sua comissão.
            </p>
          </div>
        </div>

        <form onSubmit={handleConvert} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              URL Original do Produto ou Loja na Shopee:
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://shopee.com.br/produto-i.18392104921... ou https://shp.ee/..."
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            />
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Proteção anti-SSRF ativa: Somente links seguros e verificados da Shopee são aceitos.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Sub-ID 1 (opcional, alfanumérico):
              </label>
              <input
                type="text"
                value={subId1}
                onChange={(e) => setSubId1(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20))}
                placeholder="instagram"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Sub-ID 2 (opcional, alfanumérico):
              </label>
              <input
                type="text"
                value={subId2}
                onChange={(e) => setSubId2(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20))}
                placeholder="campanhamaio"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>Processando na API Shopee...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Converter para Link de Afiliado</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Resultado da Conversão */}
      {result && (
        <div
          className={`border rounded-xl p-5 ${
            result.success
              ? 'bg-emerald-950/20 border-emerald-800/40'
              : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          {result.success && result.shortLink ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Link Gerado com Sucesso!
                </span>
                <span className="text-[11px] text-zinc-500">
                  {result.generatedAt ? new Date(result.generatedAt).toLocaleTimeString('pt-BR') : ''}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5">
                <span className="text-xs font-mono text-zinc-100 flex-1 truncate select-all">
                  {result.shortLink}
                </span>
                <button
                  onClick={() => copyToClipboard(result.shortLink!)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
                <a
                  href={result.shortLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
                  title="Abrir link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-2.5">
                <p><strong>Aviso de Afiliado:</strong> {result.affiliateDisclaimer}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Atenção na Geração do Link</p>
                <p className="text-zinc-400 mt-1">{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regras e Dicas */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 space-y-2">
        <h4 className="font-medium text-zinc-200">Como funciona a geração oficial:</h4>
        <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
          <li>Utiliza a mutação oficial GraphQL <code>generateShortLink</code> da Shopee Open API.</li>
          <li>Requer as variáveis <code>SHOPEE_APP_ID</code> e <code>SHOPEE_APP_SECRET</code> ativas na Vercel.</li>
          <li>Os parâmetros <code>subIds</code> são vinculados aos relatórios de conversão da Shopee para mensuração de tráfego.</li>
        </ul>
      </div>
    </div>
  );
};
