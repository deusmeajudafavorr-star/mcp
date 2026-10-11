import React, { useState } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { SearchTab } from './components/SearchTab.tsx';
import { LinkConverterTab } from './components/LinkConverterTab.tsx';
import { ChatGptSimulatorTab } from './components/ChatGptSimulatorTab.tsx';
import { AdminTab } from './components/AdminTab.tsx';
import { McpDocsTab } from './components/McpDocsTab.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'convert' | 'chatgpt' | 'admin' | 'mcp'>('search');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
        {activeTab === 'search' && <SearchTab />}
        {activeTab === 'convert' && <LinkConverterTab />}
        {activeTab === 'chatgpt' && <ChatGptSimulatorTab />}
        {activeTab === 'admin' && <AdminTab />}
        {activeTab === 'mcp' && <McpDocsTab />}
      </main>

      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>Busca Busca © 2026</span>
            <span aria-hidden="true">·</span>
            <span>API Oficial Shopee Afiliados Brasil</span>
            <span aria-hidden="true">·</span>
            <span>MCP Protocol v2024-11-05</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="https://affiliate.shopee.com.br/open_api/home"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-orange-400 transition-colors"
            >
              Documentação Oficial Shopee
            </a>
            <a
              href="https://modelcontextprotocol.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-orange-400 transition-colors"
            >
              Especificação MCP
            </a>
            <a
              href="https://developers.openai.com/apps-sdk/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-orange-400 transition-colors"
            >
              OpenAI Apps SDK
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
