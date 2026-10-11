import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, ExternalLink, AlertCircle, ShoppingBag, ArrowUpDown } from 'lucide-react';
import { Product, SearchResponse } from '../types.ts';

const QUICK_SEARCHES = ['Fone Bluetooth', 'Mouse Gamer', 'Suporte Notebook', 'Teclado Mecânico', 'Carregador 30W', 'Mochila'];

export const SearchTab: React.FC = () => {
  const [query, setQuery] = useState('fone bluetooth');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'sales' | 'price_asc' | 'price_desc' | 'rating'>('relevance');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          min_price: minPrice ? parseFloat(minPrice) : undefined,
          max_price: maxPrice ? parseFloat(maxPrice) : undefined,
          sort_by: sortBy,
          limit: 12,
        }),
      });

      if (!res.ok) {
        throw new Error(`Erro na busca: ${res.statusText}`);
      }

      const data: SearchResponse = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch('fone bluetooth');
  }, []);

  return (
    <div className="space-y-6">
      {/* Barra de Pesquisa */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col md:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite o que deseja encontrar na Shopee..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400">
              <span>R$</span>
              <input
                type="number"
                placeholder="Mín"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-14 bg-transparent text-zinc-200 focus:outline-none"
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Máx"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-14 bg-transparent text-zinc-200 focus:outline-none"
              />
            </div>

            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                }}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-orange-500"
              >
                <option value="relevance">Relevância</option>
                <option value="sales">Mais Vendidos</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
                <option value="rating">Melhor Avaliação</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? 'Buscando...' : 'Pesquisar'}
            </button>
          </div>
        </form>

        {/* Sugestões rápidas */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800/60 overflow-x-auto text-xs">
          <span className="text-zinc-500 whitespace-nowrap">Sugestões:</span>
          {QUICK_SEARCHES.map((item) => (
            <button
              key={item}
              onClick={() => {
                setQuery(item);
                handleSearch(item);
              }}
              className="text-zinc-400 hover:text-orange-400 hover:bg-zinc-800/80 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Status da Fonte */}
      {results && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-400 gap-2 px-1">
          <div className="flex items-center gap-2">
            <span>Encontradas <strong className="text-zinc-200">{results.total} ofertas</strong></span>
            <span aria-hidden="true">·</span>
            <span>
              Fonte: {results.source === 'shopee_official_api' ? (
                <span className="text-emerald-400 font-medium">API Oficial Shopee Afiliados</span>
              ) : (
                <span className="text-amber-400 font-medium">Catálogo Verificado</span>
              )}
            </span>
          </div>
          <div>
            <span>Consulta: {new Date(results.queryTime).toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 text-xs text-red-300 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Falha na pesquisa</p>
            <p className="text-red-400/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Grade de Produtos */}
      {results && results.products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.products.map((product) => (
            <div
              key={product.itemId}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Imagem do Produto */}
                <div className="relative aspect-square w-full bg-zinc-950 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.productName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {product.priceDiscountRate && (
                    <div className="absolute top-2 left-2 bg-orange-600 text-white font-bold text-[11px] px-2 py-0.5 rounded shadow">
                      {product.priceDiscountRate}% OFF
                    </div>
                  )}
                </div>

                {/* Dados do Produto */}
                <div className="p-4 space-y-2.5">
                  <h3 className="text-xs font-medium text-zinc-100 line-clamp-2 leading-relaxed" title={product.productName}>
                    {product.productName}
                  </h3>

                  {/* Metadados limpos sem pills vazias */}
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    {product.ratingStar && <span>★ {product.ratingStar.toFixed(1)}</span>}
                    {product.ratingStar && product.sales && <span aria-hidden="true">·</span>}
                    {product.sales && <span>{product.sales.toLocaleString('pt-BR')} vendidos</span>}
                    {product.shopName && <span aria-hidden="true">·</span>}
                    {product.shopName && <span className="truncate max-w-[90px]">{product.shopName}</span>}
                  </div>

                  {/* Preços */}
                  <div className="pt-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-zinc-50">
                        R$ {product.price.toFixed(2).replace('.', ',')}
                      </span>
                      {product.priceMax && product.priceMax > product.price && (
                        <span className="text-xs text-zinc-500 line-through">
                          R$ {product.priceMax.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Ação do Afiliado */}
              <div className="p-4 pt-0">
                <a
                  href={product.offerLink || product.productLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-orange-600/90 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Ver Oferta na Shopee</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nenhum produto */}
      {results && results.products.length === 0 && (
        <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <ShoppingBag className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <h4 className="text-sm font-medium text-zinc-300">Nenhuma oferta encontrada</h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Tente pesquisar com termos mais genéricos como "fone", "mouse", "teclado" ou ajustar a faixa de preços.
          </p>
        </div>
      )}

      {/* Aviso legal obrigatório de transparência */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 text-[11px] text-zinc-400 text-center">
        ⚠️ <strong>Transparência:</strong> Este é um link de afiliado. Podemos receber comissão por compras elegíveis, sem custo adicional para você.
      </div>
    </div>
  );
};
