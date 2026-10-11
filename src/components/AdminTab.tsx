import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, Server, RefreshCw, AlertCircle, CheckCircle2, Terminal, ExternalLink } from 'lucide-react';
import { AdminStatus, DiagnosticResult, LogItem } from '../types.ts';

export const AdminTab: React.FC = () => {
  const [adminKey, setAdminKey] = useState<string>(() => sessionStorage.getItem('bb_admin_key') || '');
  const [inputKey, setInputKey] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [authTestResult, setAuthTestResult] = useState<DiagnosticResult | null>(null);
  const [authTesting, setAuthTesting] = useState<boolean>(false);
  const [linkTestResult, setLinkTestResult] = useState<any>(null);
  const [linkTesting, setLinkTesting] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Verifica status se chave já salva
  useEffect(() => {
    if (adminKey) {
      fetchStatus(adminKey);
    }
  }, [adminKey]);

  const fetchStatus = async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/status', {
        headers: { 'x-admin-key': key },
      });

      if (res.status === 401 || res.status === 403) {
        setIsAuthenticated(false);
        setError('Chave administrativa inválida ou não autorizada.');
        sessionStorage.removeItem('bb_admin_key');
        return;
      }

      if (res.status === 503) {
        setIsAuthenticated(false);
        setError('ADMIN_SECRET_KEY não está configurada nas variáveis de ambiente da Vercel.');
        return;
      }

      if (!res.ok) {
        throw new Error(`Erro ${res.status}: ${res.statusText}`);
      }

      const data: AdminStatus = await res.json();
      setStatus(data);
      setIsAuthenticated(true);
      sessionStorage.setItem('bb_admin_key', key);
      fetchLogs(key);
    } catch (err: any) {
      setError(err.message || 'Falha ao verificar status administrativo.');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (key = adminKey) => {
    try {
      const res = await fetch('/api/admin/logs', {
        headers: { 'x-admin-key': key },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Falha ao carregar logs:', err);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    setAdminKey(inputKey.trim());
    fetchStatus(inputKey.trim());
  };

  const handleLogout = () => {
    setAdminKey('');
    setInputKey('');
    setIsAuthenticated(false);
    setStatus(null);
    sessionStorage.removeItem('bb_admin_key');
  };

  const handleTestAuth = async () => {
    setAuthTesting(true);
    setAuthTestResult(null);
    try {
      const res = await fetch('/api/admin/test-auth', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const data: DiagnosticResult = await res.json();
      setAuthTestResult(data);
      fetchLogs();
    } catch (err: any) {
      setAuthTestResult({
        configured: true,
        appIdConfigured: true,
        appSecretConfigured: true,
        endpointReachable: false,
        authenticated: false,
        message: err.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setAuthTesting(false);
    }
  };

  const handleTestLink = async () => {
    setLinkTesting(true);
    setLinkTestResult(null);
    try {
      const res = await fetch('/api/admin/test-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          url: 'https://shopee.com.br/product/18392104921/123456',
          subIds: ['admin-diag-test'],
        }),
      });
      const data = await res.json();
      setLinkTestResult(data);
      fetchLogs();
    } catch (err: any) {
      setLinkTestResult({ success: false, error: err.message });
    } finally {
      setLinkTesting(false);
    }
  };

  // Se não autenticado, exibe formulário de autenticação
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-8 space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-zinc-100">Painel Administrativo Protegido</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Digite a chave mestra configurada em <code>ADMIN_SECRET_KEY</code> na Vercel para visualizar diagnósticos e logs seguros.
          </p>

          <form onSubmit={handleLogin} className="mt-5 space-y-3">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Digite a ADMIN_SECRET_KEY..."
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={loading || !inputKey.trim()}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
            >
              {loading ? 'Validando chave...' : 'Acessar Painel'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-950/30 border border-red-800/40 rounded-lg text-xs text-red-300 text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-[11px] text-zinc-400 space-y-1.5">
          <p className="font-medium text-zinc-300">Como configurar o acesso administrativo:</p>
          <p>1. No painel da Vercel: <strong>Project Settings → Environment Variables</strong></p>
          <p>2. Adicione a chave: <code>ADMIN_SECRET_KEY</code> com qualquer frase secreta forte.</p>
          <p>3. Faça um novo deploy ou reinicie o servidor local com <code>.env</code>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra superior de controle */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Painel de Diagnóstico & Segurança</h2>
            <p className="text-[11px] text-zinc-400">Ambiente autenticado · Nenhum segredo é exibido ou transmitido</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchStatus(adminKey)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Grid de Estado e Variáveis */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card: Variáveis de Ambiente */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Variáveis de Ambiente (Vercel)
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-zinc-950 rounded-lg border border-zinc-800/60">
                <span className="font-mono text-zinc-400">SHOPEE_APP_ID</span>
                <span className={`text-[11px] font-medium flex items-center gap-1 ${
                  status.credentials.SHOPEE_APP_ID_CONFIGURED ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {status.credentials.SHOPEE_APP_ID_CONFIGURED ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Presente ({status.credentials.appIdMasked})
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" /> Não configurado
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-zinc-950 rounded-lg border border-zinc-800/60">
                <span className="font-mono text-zinc-400">SHOPEE_APP_SECRET</span>
                <span className={`text-[11px] font-medium flex items-center gap-1 ${
                  status.credentials.SHOPEE_APP_SECRET_CONFIGURED ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {status.credentials.SHOPEE_APP_SECRET_CONFIGURED ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Presente (oculto)
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" /> Não configurado
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-zinc-950 rounded-lg border border-zinc-800/60">
                <span className="font-mono text-zinc-400">ADMIN_SECRET_KEY</span>
                <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                </span>
              </div>
            </div>
          </div>

          {/* Card: Servidor e Runtime */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Estado do Servidor
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Status</span>
                <span className="text-emerald-400 font-medium">Online</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Uptime</span>
                <span className="text-zinc-200">{status.server.uptimeFormatted}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Ambiente</span>
                <span className="text-zinc-200">{status.server.environment}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-400">Uso de Memória</span>
                <span className="text-zinc-200">{status.server.memoryUsageMb} MB</span>
              </div>
            </div>
          </div>

          {/* Card: Operações Disponíveis */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Capacidades Documentadas
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-zinc-300">Geração de Links (generateShortLink)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-zinc-300">Pesquisa de Ofertas (productOfferV2)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-zinc-300">MCP Protocol v2024-11-05 (/mcp)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-zinc-300">ChatGPT Apps SDK Widgets</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ações de Teste Interativo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Teste 1: Autenticação Shopee */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">Teste de Autenticação Shopee GraphQL</h4>
            <p className="text-[11px] text-zinc-400">
              Dispara uma requisição autenticada leve contra a API Oficial Shopee para validar AppId e Secret.
            </p>
          </div>

          <button
            onClick={handleTestAuth}
            disabled={authTesting}
            className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {authTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{authTesting ? 'Testando conexão...' : 'Executar Teste de Autenticação'}</span>
          </button>

          {authTestResult && (
            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              authTestResult.authenticated
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                : 'bg-amber-950/20 border-amber-800/40 text-amber-300'
            }`}>
              <div className="font-semibold flex items-center gap-1.5">
                {authTestResult.authenticated ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{authTestResult.authenticated ? 'Autenticação Válida!' : 'Resultado do Teste'}</span>
              </div>
              <p className="text-[11px] text-zinc-400">{authTestResult.message}</p>
              {authTestResult.latencyMs && (
                <p className="text-[10px] text-zinc-500">Latência: {authTestResult.latencyMs}ms</p>
              )}
            </div>
          )}
        </div>

        {/* Teste 2: Geração de Link */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">Teste de Geração de Link de Afiliado</h4>
            <p className="text-[11px] text-zinc-400">
              Testa a chamada da mutação <code>generateShortLink</code> com uma URL de validação.
            </p>
          </div>

          <button
            onClick={handleTestLink}
            disabled={linkTesting}
            className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {linkTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{linkTesting ? 'Gerando link...' : 'Executar Teste de Link'}</span>
          </button>

          {linkTestResult && (
            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              linkTestResult.success
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
            }`}>
              <div className="font-semibold flex items-center gap-1.5">
                {linkTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                <span>{linkTestResult.success ? 'Link Gerado!' : 'Aviso da Operação'}</span>
              </div>
              {linkTestResult.shortLink && (
                <p className="font-mono text-[11px] text-zinc-200 select-all">{linkTestResult.shortLink}</p>
              )}
              {linkTestResult.error && (
                <p className="text-[11px] text-amber-300">{linkTestResult.error}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Visualizador de Logs Sanitizados */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-400" />
            <h4 className="text-xs font-semibold text-zinc-200">Últimos Logs Técnicos & Auditoria (Sanitizados)</h4>
          </div>
          <button
            onClick={() => fetchLogs()}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Recarregar logs
          </button>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-[11px] space-y-2 max-h-60 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-zinc-600">Nenhum evento registrado no buffer do servidor.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="border-b border-zinc-900 pb-1.5 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 text-zinc-500 text-[10px]">
                  <span>{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                  <span aria-hidden="true">·</span>
                  <span className={`uppercase font-bold ${
                    log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-400' : 'text-blue-400'
                  }`}>
                    {log.level}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-zinc-400">[{log.category}]</span>
                </div>
                <div className="text-zinc-300 mt-0.5">{log.message}</div>
                {log.data && (
                  <pre className="text-zinc-500 text-[10px] mt-0.5 bg-zinc-900/50 p-1 rounded overflow-x-auto">
                    {JSON.stringify(log.data)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
        <p className="text-[10px] text-zinc-500">
          * Todas as chaves secretas, tokens de autenticação e credenciais são automaticamente removidas antes de serem registradas.
        </p>
      </div>
    </div>
  );
};
