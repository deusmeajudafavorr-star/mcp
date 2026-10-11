import React from 'react';
import { Search, Link2, Bot, ShieldCheck, BookOpen, ShoppingBag } from 'lucide-react';

interface NavbarProps {
  activeTab: 'search' | 'convert' | 'chatgpt' | 'admin' | 'mcp';
  setActiveTab: (tab: 'search' | 'convert' | 'chatgpt' | 'admin' | 'mcp') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'search', label: 'Buscar Ofertas', icon: Search },
    { id: 'convert', label: 'Conversor de Links', icon: Link2 },
    { id: 'chatgpt', label: 'Simulador ChatGPT', icon: Bot },
    { id: 'admin', label: 'Painel Admin', icon: ShieldCheck },
    { id: 'mcp', label: 'Conexão MCP & Docs', icon: BookOpen },
  ] as const;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/20 font-black text-lg">
            B
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-100 tracking-tight">Busca Busca</h1>
              <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                Shopee + MCP
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Backend Vercel · API Oficial de Afiliados · ChatGPT Apps SDK
            </p>
          </div>
        </div>

        {/* Tab Buttons (Interactive Segmented Control) */}
        <nav className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl overflow-x-auto max-w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-500' : 'text-zinc-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
